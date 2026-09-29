# ProfissionalHub — Backend

API do ProfissionalHub, uma ferramenta de gestão para profissionais de Educação Física autônomos.

## Estado atual

Implementados: cadastro, login, consulta de perfil, locais salvos e cadastro de alunos por profissional. Os dados são persistidos no MongoDB, as senhas são armazenadas com hash bcrypt e o login retorna um JWT com validade de sete dias.

Ainda faltam atendimentos, cobranças e reposições, a integração com o frontend e a publicação com HTTPS. O frontend continua usando sua sessão demonstrativa até essa integração.

## Executar localmente

É necessário ter Node.js 20.19 ou superior e MongoDB em execução.

Na pasta deste repositório:

```bash
npm ci
npm run dev
```

A API atende em `http://localhost:3000`. `npm run dev` reinicia o servidor quando os arquivos mudam; `npm start` inicia sem esse monitoramento.

Em desenvolvimento, é possível iniciar sem `.env`: o banco padrão é `mongodb://127.0.0.1:27017/profissionalhub`. Para personalizar, copie `.env.example` para `.env`:

| Variável | Uso |
| --- | --- |
| `PORT` | Porta do servidor; padrão `3000`. |
| `MONGODB_URI` | Endereço do banco de dados. |
| `JWT_SECRET` | Segredo usado para assinar e verificar tokens. |
| `ALLOWED_ORIGINS` | Endereços do frontend separados por vírgula. Inclua a porta usada pelo Vite. |
| `NODE_ENV` | `development` localmente ou `production` na publicação. |

Em produção, `MONGODB_URI`, `ALLOWED_ORIGINS` e um `JWT_SECRET` de pelo menos 32 caracteres são obrigatórios. A chave padrão de desenvolvimento não deve ser usada na publicação. Este bloco não precisa da chave Geoapify: ele armazena os locais selecionados pelo usuário.

## Rotas

As rotas recebem e retornam JSON. Nas rotas protegidas, envie `Authorization: Bearer SEU_TOKEN`.

| Método | Rota | Autenticação | Função |
| --- | --- | --- | --- |
| POST | `/signup` | Pública | Criar conta com `name`, `email` e `password`. |
| POST | `/signin` | Pública | Receber `{ "token": "..." }` com `email` e `password`. |
| GET | `/users/me` | JWT | Consultar o perfil autenticado. |
| GET | `/locations` | JWT | Listar os locais da conta autenticada. |
| POST | `/locations` | JWT | Salvar um local. |
| DELETE | `/locations/:locationId` | JWT | Excluir um local pertencente à conta autenticada. |

Exemplo de cadastro:

```json
{
  "name": "Ana Silva",
  "email": "ana@example.com",
  "password": "uma-senha-de-exemplo"
}
```

O nome deve ter de 2 a 30 caracteres. A senha deve ter no mínimo 8 caracteres e no máximo 72 bytes. O email deve ser válido e exclusivo. Senhas e hashes não são enviados nas respostas.

Exemplo de local:

```json
{
  "name": "Parque de exemplo",
  "address": "Rua de exemplo, 10 — São Paulo",
  "category": "leisure.park",
  "placeId": "identificador-retornado-pela-geoapify",
  "coordinates": [-46.63, -23.55]
}
```

`name`, `address` e `category` são obrigatórios. `placeId` e `coordinates` são opcionais. As coordenadas seguem a ordem longitude, latitude. O proprietário é definido pelo token; não envie `owner` no corpo. Um mesmo `placeId` só pode ser salvo uma vez por conta.

Erros retornam `{ "message": "..." }`, com códigos `400` (dados inválidos), `401` (não autenticado), `403` (local de outra conta), `404` (não encontrado), `409` (duplicidade) e `500` (erro interno). Cadastro e login têm limite de requisições por IP e podem retornar `429`.

## Alunos

Todas as rotas de alunos exigem JWT e só acessam os dados do profissional autenticado.

| Método | Rota | Função |
| --- | --- | --- |
| POST | `/students` | Cadastrar aluno, inicialmente ativo. |
| GET | `/students` | Listar os próprios alunos, inclusive inativos. |
| GET | `/students/:studentId` | Consultar um aluno próprio. |
| PATCH | `/students/:studentId` | Editar telefone, email, objetivo ou situação. |

Exemplo de cadastro:

```json
{
  "name": "Maria Silva",
  "phone": "+55 (11) 99999-9999",
  "email": "maria@example.com",
  "goal": "Melhorar o condicionamento físico"
}
```

- `name`: obrigatório, de 2 a 60 caracteres. Não pode ser enviado na edição.
- `phone`: obrigatório, celular brasileiro com DDD válido e nove dígitos começando em 9. Aceita DDD e número com ou sem prefixo 55 e formatação; armazena e retorna `+5511999999999`. A máscara `+55 (11) 99999-9999` será aplicada na futura integração do formulário. A validação de formato não verifica se existe uma conta WhatsApp ativa.
- `email`: opcional, validado quando preenchido; pode ser apagado enviando `""`.
- `goal`: texto livre opcional, até 120 caracteres; pode ser apagado enviando `""`.
- `active`: definido automaticamente como `true` no cadastro. Para inativar, envie `PATCH` com `{ "active": false }`; para reativar, `{ "active": true }`.

O telefone é exclusivo por profissional, inclusive para alunos inativos. Números equivalentes com formatações diferentes são considerados iguais. Duplicidade retorna `409` com a mensagem `Já existe um aluno cadastrado com este telefone`. A verificação também se aplica à edição, mas manter o próprio telefone é permitido. Ao trocar o número, o antigo fica disponível para outro cadastro.

O proprietário vem do token; campos como `owner`, `name` na edição e campos desconhecidos são rejeitados. Consulta ou edição de aluno inexistente ou pertencente a outra conta retorna `404`. Não há rota de exclusão: o cadastro pode ser inativado para preservar seu histórico.

Na futura integração, o formulário atual precisará exigir telefone, tornar email opcional, impedir edição do nome e aplicar a máscara com `+55`. Os campos `name`, `phone`, `email` e `goal` já correspondem aos usados no frontend. A API retorna `_id`; a interface demonstrativa utiliza `id`, que precisará ser adaptado. A cor do avatar permanece uma decisão de apresentação do frontend.

## Organização

- `server.js`: conecta ao MongoDB e inicia o servidor.
- `app.js`: configura os middlewares e as rotas do Express.
- `routes/`: associa URLs aos controladores.
- `controllers/`: implementa as ações de usuários e locais.
- `models/`: define os documentos e validações do MongoDB.
- `middlewares/`: autenticação, validação, logs, limite de requisições e tratamento de erros.
- `config/`, `errors/` e `utils/`: configuração, classe de erro e mensagens compartilhadas.

## Verificação

```bash
npm run lint
npm test
```

O lint segue Airbnb Base. Os testes de integração exigem MongoDB local na porta `27017`. Criam e removem um banco temporário `profissionalhub_test_*`, separado do banco do aplicativo, verificando cadastro, login, validações, persistência, respostas de erro e isolamento entre duas contas.

Requisições e erros são registrados em JSON em `logs/request.log` e `logs/error.log`. Corpos, cabeçalhos e query strings não são registrados para evitar gravar credenciais. `.env`, logs e `node_modules` são ignorados pelo Git; `.env.example` contém somente configuração de exemplo.

Desenvolvimento na branch `stage-back-end`, com futura pull request para `main`.
