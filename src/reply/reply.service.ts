import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import * as qs from 'qs';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ReplyService {
  @Inject(RedisService)
  private readonly redisService: RedisService;
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  private async getBaiduAccessToken() {
    const cache = await this.redisService.get('baidu-access-token');
    if (cache) return cache;
    const url = this.configService.get('baidu.token_api');
    const search = qs.stringify({
      grant_type: 'client_credentials',
      client_id: this.configService.get('baidu.ak'),
      client_secret: this.configService.get('baidu.sk'),
    });
    const response = await fetch(`${url}?${search}`).then((res) => res.json());
    const { access_token, expires_in } = response;
    await this.redisService.set('baidu_access_token', access_token, expires_in);
    return access_token;
  }

  async chat(content: string) {
    const token = await this.getBaiduAccessToken();
    const search = qs.stringify({ access_token: token });
    const url = this.configService.get('baidu.chat_api') + '?' + search;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: content,
          },
        ],
      }),
    }).then((res) => res.json());
    return res.result;
  }

  async dn_rank() {
    return '暂无数据';
  }

  @Cron('0 53 16 * * *')
  async update_dn_activity() {
    await this.dn_activity('up');
  }

  async dn_activity(content) {
    // 获取活动列表
    const cache = await this.redisService.get('dn_activity');
    if (content.trim() !== 'up' && cache) return cache;

    console.info('update dn activity');
    const response = await fetch(
      `https://dn.web.sdo.com/web11/handler/GetNewsList.ashx`,
      {
        method: 'POST',
        headers: {
          'Content-Encoding': 'gzip',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Origin: 'https://dn.web.sdo.com',
          Pragma: 'no-cache',
          Referer: 'https://dn.web.sdo.com/web11/home/',
        },
        body: 'CategoryCode=103&PageSize=8&PageIndex=0',
      },
    ).then((res) => res.json());
    let fields;
    const new_week_activity = JSON.parse(response.ReturnObject)
      .dataList.reduce((pre, cur, index) => {
        if (index !== 0) {
          pre.push(
            cur.reduce((obj, value, index) => {
              obj[fields[index]] = value;
              return obj;
            }, {}),
          );
        } else {
          fields = cur;
        }
        return pre;
      }, [])
      .map((i, index) => {
        const link =
          i.OutLink ||
          `https://dn.web.sdo.com/web11/news/newsContent.html?ID=${i.ID}&CategoryID=${i.CategoryCode}`;
        const strongWrapper = (content) =>
          i.TitleClass ? `**${content}**` : content;
        const title = strongWrapper(`[${i.Title}](${link})`);
        const prefix = `${index + 1}.  `;
        const suffix = `  ${i.PublishDate}`;
        return prefix + title + suffix;
      })
      .join('\n');
    this.redisService.set('dn_activity', new_week_activity, 60 * 60 * 24);
    return new_week_activity;
  }
}
