export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
  },
  kook_bot: {
    token: '',
    verify_token: '',
    encrypt_key: '',
    version: '0.0.1',
    api: {
      host: 'https://www.kookapp.cn/api/v3',
      routes: {
        send_group_message: '/message/create',
        send_private_message: '/private/message',
        update_message: '/message',
        reaction_message: '/reaction',
      },
    },
  },
  baidu: {
    token_api: 'https://aip.baidubce.com/oauth/2.0/token',
    ak: '',
    sk: '',
    chat_api:
      'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});