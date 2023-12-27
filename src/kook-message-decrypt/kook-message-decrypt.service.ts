import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDecipheriv } from 'crypto';
import {
  KookMsgType,
  type KookBotConfig,
  SYSTEM_AUTHOR_ID,
  KookChannelType,
  KookCommandType,
} from 'src/types/kook';
import { get } from 'lodash';

@Injectable()
export class KookMessageDecryptService {
  @Inject(ConfigService)
  private readonly configService: ConfigService;
  // 在 encrpytKey 后面补 \0 至长度等于 32 位，得到 key
  private zero_padding(key: string) {
    const keyByte = Buffer.from(key, 'utf-8');
    if (keyByte.length < 32) {
      const result = Buffer.alloc(32);
      Buffer.from(key, 'utf-8').copy(result);
      return result;
    }
    return keyByte;
  }

  // 解密kook消息
  private decrypt_data(encrypt_data) {
    const bot_config = this.configService.get<KookBotConfig>('kook_bot');
    // 1.将密文用 base64 解码
    const encrypted = Buffer.from(encrypt_data, 'base64');
    // 2.截取前16位得到 iv,
    const iv = encrypted.subarray(0, 16);
    // 3. 截取16位之后的数据为新的密文 用 base64 解码新的密文, 得到待解密数据
    const encryptedData = Buffer.from(
      encrypted.subarray(16, encrypted.length).toString(),
      'base64',
    );
    // 4. 在 encrpytKey 后面补 \0 至长度等于 32 位，得到 key
    const key = this.zero_padding(bot_config.encrypt_key);
    // 5. 利用上面的 iv, key, 待解密数据，采用 aes-256-cbc 解密数据
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    // 6. 将数据转为buffer 再转为JSON
    const decrypt = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
    const data = JSON.parse(decrypt.toString());

    // 校验请求的verify_token 与机器人的是否一致 防止收到伪造的消息
    if (data.d.verify_token !== bot_config.verify_token) {
      throw Error('verify_token不一致');
    }
    return data;
  }

  // 获取kook消息 防止解密失败报错
  decrypt_message(encrypt_data) {
    try {
      const data = this.decrypt_data(encrypt_data);
      return data;
    } catch (error) {
      return {};
    }
  }

  clean_kook_message(message) {
    const {
      channel_type = '',
      content = '',
      author_id = '',
      type = '',
      msg_id = '',
      target_id = '',
    } = message;

    const isTextMessage =
      type === KookMsgType.TEXT || type === KookMsgType.KMARKDOWN;
    const isSysTemMessage =
      type === KookMsgType.SYSTEM || author_id === SYSTEM_AUTHOR_ID;
    const isPrivate =
      channel_type === KookChannelType.PERSON &&
      isTextMessage &&
      !isSysTemMessage;
    if (!isTextMessage || isSysTemMessage) return null;

    const trim_content = content.trim();
    // 解析命令
    const commands = Object.values(KookCommandType).join('|');
    const regex = new RegExp(`^/(${commands})(.*)$`);
    const match = trim_content.match(regex);
    const command = get(match, '[1]', '');
    const command_content = get(match, '[2]', '');

    if (!command) return;

    return {
      id: msg_id,
      message: {
        target_id,
        author_id,
        type,
        msg_id,
      },
      is_private: isPrivate,
      command,
      command_content,
    };
  }
}
