import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import * as MarkdownIt from 'markdown-it';
import * as puppeteer from 'puppeteer';
import * as qs from 'qs';
import { RedisService } from 'src/redis/redis.service';
import { parseHtmlTableTo2DArray } from 'src/utils';

dayjs.extend(relativeTime);

const md = new MarkdownIt();

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

  async dn_activity(content, newId?) {
    if (content.trim() === 'up') {
      await this.redisService.clear('dn_recent_activity');
      await this.redisService.clear('dn_week_activity');
    }

    const rencent_activity = await this.get_recent_activity();
    const week_activity = await this.get_week_activity();

    const cards = [];

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

    cards.push(week_card, recent_card);

    if (newId) {
      cards.push({
        type: 'card',
        theme: 'primary',
        size: 'lg',
        modules: [
          {
            type: 'header',
            text: {
              type: 'plain-text',
              content: '活动详情',
            },
          },
          {
            type: 'section',
            text: {
              type: 'kmarkdown',
              content: (
                await this.redisService.get(`dn_activity_${newId}_data`)
              ).replaceAll('&gt;', '>'),
            },
          },
          {
            type: 'container',
            elements: [
              {
                type: 'image',
                src: await this.redisService.get(`dn_activity_${newId}`),
                alt: '',
                size: 'lg', // size只用在图文混排  图片组大小固定
                circle: false,
              },
            ],
          },
        ],
      });
    }

    const activities = JSON.stringify(cards);
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

  async analyze_activity(id) {
    const cache = await this.redisService.get(`dn_activity_${id}`);
    const cache_data = await this.redisService.get(`dn_activity_${id}_data`);
    if (cache) {
      return {
        url: cache,
        data: cache_data,
      };
    }
    const response = await fetch(
      'https://dn.web.sdo.com/web11/handler/GetNewsContent.ashx',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          Connection: 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Origin: 'https://dn.web.sdo.com',
          Referer: `https://dn.web.sdo.com/web11/news/newsContent.html?ID=${id}&CategoryID=103`,
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
        body: `ID=${id}`,
      },
    ).then((res) => res.json());
    const content = JSON.parse(response.ReturnObject)
      .Content.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&ge;/g, '>=')
      .trim();
    const analysis = await fetch(this.configService.get('gpt4.api'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.configService.get('gpt4.token')}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: `请分析下面的活动，将每一项拆分成表格返回，表格列分别为:编号、活动要求、活动奖励。奖励发放方式、备注；表格要求内容简要明确，不能丢失关键信息。以下为活动内容:\n\n
            ${content}`,
          },
        ],
        stream: false,
        model: 'gpt-4',
        temperature: 0.5,
        presence_penalty: 0,
        frequency_penalty: 0,
        top_p: 1,
      }),
    }).then((res) => res.json());
    const ac_res = analysis.choices[0].message.content;
    const { url, data } = await this.mdToKookImage(ac_res, id);
    await this.redisService.set(`dn_activity_${id}`, url, 60 * 60 * 24 * 14);
    await this.redisService.set(
      `dn_activity_${id}_data`,
      data,
      60 * 60 * 24 * 14,
    );
    return url;
  }

  async mdToKookImage(content, id) {
    const html = md.render(content);
    const data = parseHtmlTableTo2DArray(html);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 10px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          
          /* 表头样式 */
          th, td {
            border: 1px solid #dddddd; /* 边框线 */
            padding: 8px; /* 单元格内边距 */
            text-align: left;
          }
          
          /* 交替行颜色 */
          tr:nth-child(even) {
            background-color: #f9f9f9; /* 浅色背景 */
          }
          
          tr:nth-child(odd) {
            background-color: #ffffff; /* 白色背景 */
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
    await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1920, height: 1080 });
    const elementHeight = await page.evaluate(() => {
      const element = document.querySelector('table');
      return element ? element.getClientRects()[0].height : null;
    });
    await page.setViewport({ width: 1920, height: elementHeight });
    const buffer = await page.screenshot({
      path: 'output.png',
      fullPage: true,
    });
    await browser.close();
    const formData = new FormData();

    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('file', blob);
    const upload = await fetch(
      `${this.configService.get('kook_bot.api.host')}${this.configService.get(
        'kook_bot.api.routes.upload',
      )}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.configService.get('kook_bot.token')}`,
        },
        body: formData,
      },
    ).then((res) => res.json());
    const [_, ..._data] = data || [];
    const url = `https://dn.web.sdo.com/web11/news/newsContent.html?ID=${id}&CategoryID=103`;
    return {
      url: upload.data.url,
      data: _data
        .map(
          (i) =>
            `${i[0]}. [${i[1]}](${url})
   ${i[3]} \`${i[2]}\``,
        )
        .join('\n'),
    };
  }

  async activity_is_update() {
    const recent_cache = await this.get_data_cache('dn_recent_activity');
    const week_cache = await this.get_data_cache('dn_week_activity');
    await this.redisService.clear('dn_recent_activity');
    await this.redisService.clear('dn_week_activity');
    const rencent_activity = await this.get_recent_activity();
    const week_activity = await this.get_week_activity();
    let newId = '';
    if (JSON.stringify(week_activity) !== JSON.stringify(week_cache)) {
      newId = week_activity[0].ID;
      await this.analyze_activity(newId);
      return newId;
    }

    if (JSON.stringify(rencent_activity) !== JSON.stringify(recent_cache)) {
      return true;
    }
  }

  transform_dn_fetch(data) {
    let fields;
    return JSON.parse(data.ReturnObject)
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
      .sort(
        (a, b) => dayjs(b.PublishDate).unix() - dayjs(a.PublishDate).unix(),
      );
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
    await this.redisService.set(key, JSON.stringify(data), 60 * 60 * 24 * 7);
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
