// Retorna apenas mensagens fixas: erros originais podem conter credenciais.
function startupError(error) {
  const errors = [error, error?.cause];
  if (error?.reason?.servers instanceof Map) {
    error.reason.servers.forEach((server) => {
      errors.push(server.error, server.error?.cause);
    });
  }
  const hasCode = (...codes) => errors.some((item) => codes.includes(item?.code));
  if (hasCode(18, 8000)) return 'AUTH: confira usuário e senha do banco no Atlas.';
  if (hasCode(13)) return 'PERMISSION: confira readWrite no banco profissionalhub.';
  if (hasCode('ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED')) {
    return 'NETWORK: confira o endereço do cluster, DNS e acesso de rede.';
  }
  if (hasCode(
    'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR',
    'CERT_HAS_EXPIRED',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'ERR_TLS_CERT_ALTNAME_INVALID',
  )) {
    return 'TLS: falha na conexão segura com o MongoDB; confira cluster e acesso de rede.';
  }
  if (hasCode('EADDRINUSE')) return 'PORT: a porta configurada já está em uso.';
  if (errors.some((item) => item?.name === 'MongoParseError')) {
    return 'URI: confira o formato de MONGODB_URI e a codificação da senha.';
  }
  if (errors.some((item) => ['MongooseServerSelectionError', 'MongoServerSelectionError']
    .includes(item?.name))) {
    return 'CONNECTION: não foi possível selecionar um servidor MongoDB; confira IPs liberados e cluster disponível.';
  }
  return 'STARTUP: falha ao conectar, preparar os índices ou abrir a porta do servidor.';
}

module.exports = startupError;
