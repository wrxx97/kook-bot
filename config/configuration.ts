export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
  },
  kook_bot: {
    token: '1/MjM2MjI=/Xc5ppF2dw16c1fUqvWL78A==',
    verify_token: 'cG8BpdpCtKhE9wbf',
    encrypt_key: 'yyRka7mor86',
    version: '0.0.1',
    api: {
      host: 'https://www.kookapp.cn/api/v3',
      routes: {
        send_group_message: '/group/message',
        send_private_message: '/private/message',
        update_message: '/message',
        reaction_message: '/reaction',
      },
    },
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
});
