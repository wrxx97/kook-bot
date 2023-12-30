export type KookBotConfig = {
  token: string;
  encrypt_key: string;
  verify_token: string;
  version: string;
};

export enum KookMsgType {
  //1:文字消息, 2:图片消息，3:视频消息，4:文件消息， 8:音频消息，9:KMarkdown，10:card 消息，255:系统消息
  TEXT = 1,
  IMAGE = 2,
  VIDEO = 3,
  FILE = 4,
  AUDIO = 8,
  KMARKDOWN = 9,
  CARD = 10,
  SYSTEM = 255,
}

export enum KookCommandType {
  // 夕阳排名
  RANK = 'r',
  // 每周活动
  WEEK_ACTIVITY = 'ac',
  // chat
  CHAT = 'c',
  // draw
  DRAW = 'draw',

  SUBSCRIBE = 'subscribe',
}

export const SYSTEM_AUTHOR_ID = '1';

export enum KookChannelType {
  // 消息通道类型, GROUP 为组播消息, PERSON 为单播消息, BROADCAST 为广播消息
  GROUP = 'GROUP',
  PERSON = 'PERSON',
  BROADCAST = 'BROADCAST',
}

export type KookEvent = {
  channel_type: KookChannelType;
  type: KookMsgType;
  target_id: string; // 发送目的, 频道消息类时, 代表的是频道 channel_id，如果 channel_type 为 GROUP 组播且 type 为 255 系统消息时，则代表服务器 guild_id
  author_id: string; // 发送者ID
  content: string; // 消息内容, 文件，图片，视频时，content 为 url
  msg_id: string;
  msg_timestamp: number; // 消息发送时间的毫秒时间戳
  nonce: string; // 随机串，与用户消息发送 api 中传的 nonce 保持一致
  extra: KookEventExtra; // 不同的消息类型，结构不一致
};

export type KookEventExtra = {
  type?: KookMsgType; // 消息类型，同上述 type 字段
  guild_id: string; // 服务器 ID
  channel_name: string; // 频道名
  mention: string[]; // 提及到的用户 ID 的列表
  mention_all: boolean; // 是否 mention 所有用户
  mention_roles: string[]; // mention 用户角色的数组
  mention_here: boolean; // 是否 mention 在线用户
  author: any; // 用户信息对象，参考用户对象类型定义
};

type SendMessage = {
  type?: KookMsgType;
  content: string; // 消息内容，必须传递
  quote?: string; // 回复的消息ID（可选）
  nonce?: string; // 服务端不处理的随机字符串，原样返回（可选）
};

export type SendGroupMsg = SendMessage & {
  target_id: string; // 目标频道ID，必须传递
  temp_target_id?: string; // 用户ID，如果传递了，则消息被视为临时消息，不存入数据库，但会在频道内针对该用户推送（可选）
};

export type SendPrivateMsg = SendMessage & {
  target_id?: string; // 目标用户ID，后端会自动创建会话。有此参数之后可不传chat_code参数
  chat_code?: string; // 目标会话Code，target_id与chat_code必须传一个
};
