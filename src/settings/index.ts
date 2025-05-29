export const allowedOrigins =
  process.env.NODE_ENV === "development"
    ? [/^http:\/\/localhost(:\d{1,5})?$/]
    : [
        /^https?:\/\/(www\.)?([a-z0-9-]+\.)?matratecnologia\.com(\.br)?$/,
        /^https?:\/\/(www\.)?([a-z0-9-]+\.)?matratecnologia\.com(\.br)?$/,
        /^https?:\/\/(www\.)?([a-z0-9-]+\.)*lerj-site\.cr0cu0\.easypanel\.host$/,
        /^https?:\/\/(www\.)?([a-z0-9-]+\.)*saleszap\.com\.br$/,
      ];
