import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import * as qs from 'qs';
import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

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

  async update_dn_activity() {
    await this.dn_activity('up');
  }

  async dn_activity(content) {
    if (content.trim() === 'up') {
      await this.redisService.clear('dn_recent_activity');
      await this.redisService.clear('dn_week_activity');
    }

    const rencent_activity = await this.get_recent_activity();
    const week_activity = await this.get_week_activity();

    const week_card = {
      type: 'card',
      theme: 'primary',
      size: 'lg',
      modules: [
        {
          type: 'header',
          text: {
            type: 'plain-text',
            content: '每周活动',
          },
        },
        {
          type: 'section',
          text: {
            type: 'kmarkdown',
            content: this.transform_dn_to_kmd(week_activity),
          },
        },
      ],
    };

    const recent_card = {
      type: 'card',
      theme: 'primary',
      size: 'lg',
      modules: [
        {
          type: 'header',
          text: {
            type: 'plain-text',
            content: '长期活动',
          },
        },
        {
          type: 'section',
          text: {
            type: 'kmarkdown',
            content: this.transform_dn_to_kmd(rencent_activity),
          },
        },
      ],
    };

    const activities = JSON.stringify([week_card, recent_card]);
    return activities;
  }

  async get_recent_activity() {
    const cache_key = 'dn_recent_activity';
    const cache = await this.get_data_cache(cache_key);
    if (cache) return cache;
    const response = await fetch(
      'https://dn.web.sdo.com/web11/handler/GetNewsList.ashx',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          Connection: 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Cookie:
            'NSC_MC-HX-eo.xfc.tep.dpn-I80=ffffffff09884e8845525d5f4f58455e445a4a423660; userinfo=userid=1861196845-1514217957-1703930181&siteid=SDG-08117-01; __wftflow=1027509654=1; LAT=l=52&l_err=6.16; RT=ul=1703930182728&r=https%3A%2F%2Fdn.web.sdo.com%2Fweb11%2Fevent%2Feventlist_on.html&hd=1703930182753',
          Origin: 'https://dn.web.sdo.com',
          Referer: 'https://dn.web.sdo.com/web11/event/eventlist_on.html',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'sec-ch-ua':
            '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
        },
        body: new URLSearchParams({
          CategoryCode: '1536,1537,2021,364,365,366',
          PageSize: '20',
          PageIndex: '0',
        }),
      },
    ).then((res) => res.json());
    const data = this.transform_dn_fetch(response);
    await this.set_data_cache(cache_key, data);
    return data;
  }

  async get_week_activity() {
    const cache_key = 'dn_week_activity';
    const cache = await this.get_data_cache(cache_key);
    if (cache) return cache;
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
    const data = this.transform_dn_fetch(response).filter((i) => !i.OutLink);
    await this.set_data_cache(cache_key, data);
    return data;
  }

  async activity_is_update() {
    const recent_cache = await this.get_data_cache('dn_recent_activity');
    const week_cache = await this.get_data_cache('dn_week_activity');
    await this.redisService.clear('dn_recent_activity');
    await this.redisService.clear('dn_week_activity');
    const rencent_activity = await this.get_recent_activity();
    const week_activity = await this.get_week_activity();

    if (
      JSON.stringify(rencent_activity) !== JSON.stringify(recent_cache) ||
      JSON.stringify(week_activity) !== JSON.stringify(week_cache)
    ) {
      return true;
    }
  }

  transform_dn_fetch(data) {
    let fields;
    console.info(data);
    return JSON.parse(data.ReturnObject).dataList.reduce((pre, cur, index) => {
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
    }, []);
  }

  transform_dn_to_kmd(data) {
    return data
      .sort((a, b) => dayjs(b.PublishDate).unix() - dayjs(a.PublishDate).unix())
      .map((i, index) => {
        const link =
          i.OutLink ||
          `https://dn.web.sdo.com/web11/news/newsContent.html?ID=${i.ID}&CategoryID=${i.CategoryCode}`;
        const strongWrapper = (content) =>
          i.TitleClass ? `**${content}**` : content;
        const title = strongWrapper(`[${i.Title}](${link})`);
        const prefix = `${index + 1}.  `;
        const suffix = ` \`${i.Author || i.PublishDate}\``;
        const end = i.Author ? this.get_activity_end_desc(i.Author) : '';
        return prefix + title + suffix + end;
      })
      .join('\n');
  }

  get_activity_end_desc(str) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [start, end] = str.split(' — ');
    return ` **${dayjs().to(dayjs(end))}**`;
  }

  async set_data_cache(key, data) {
    await this.redisService.set(key, JSON.stringify(data), 60 * 60 * 24);
  }

  async get_data_cache(key) {
    const cache = await this.redisService.get(key);
    if (cache) return JSON.parse(cache);
    return null;
  }

  async subscribe(target_id) {
    const cache = (await this.redisService.get('subscribe_target_ids')) || '';
    const target_ids = cache.split(',').filter(Boolean);
    if (target_ids.includes(target_id)) return '已经订阅过了';
    target_ids.push(target_id);
    await this.redisService.set('subscribe_target_ids', target_ids.join(','));
    return '订阅成功';
  }

  async unsubscribe(target_id) {
    const cache = (await this.redisService.get('subscribe_target_ids')) || '';
    const target_ids = cache.split(',').filter(Boolean);
    if (!target_ids.includes(target_id)) return '没有订阅过';
    await this.redisService.set(
      'subscribe_target_ids',
      target_ids.filter((i) => i !== target_id).join(','),
    );
    return '取消订阅成功';
  }
}
