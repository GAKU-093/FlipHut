# FliPHut

Site para criar e publicar quadrinhos, filmes, séries e livros. Qualquer pessoa lê e assiste de graça, sem conta. Para publicar, precisa entrar.

No ar em: https://gaku-093.github.io/FlipHut/

## Pastas

```
index.html      página única do site
style.css       visual
js/config.js    endereço e chave pública do Supabase, liga/desliga Google e celular
js/app.js       todo o funcionamento do site
images/         logo e ícone da aba
```

Não tem build nem instalação: é HTML, CSS e JavaScript puro. A biblioteca do Supabase vem do jsDelivr (CDN).

## Rodar no computador

Na pasta do projeto:

```
python3 -m http.server 8000
```

Depois abra http://localhost:8000. Abrir o `index.html` direto (dando dois cliques) não funciona, porque o login precisa de um endereço `http://`.

Para o login funcionar no local, `http://localhost:8000` precisa estar nas URLs de redirecionamento do Supabase (veja abaixo).

## config.js

| Campo | Para que serve |
|---|---|
| `SUPABASE_URL` | Endereço do projeto no Supabase |
| `SUPABASE_KEY` | Chave **pública** (publishable). Pode ficar no site |
| `ENABLE_GOOGLE` | Mostra o botão "Continuar com Google" |
| `ENABLE_PHONE` | Mostra "Entrar com celular" |

Nunca coloque no `config.js` a chave `service_role` (secret) nem a senha do banco: tudo nessa pasta fica público no GitHub e no site.

## O que o site espera do Supabase

### Tabelas (schema `public`)

| Tabela | Colunas que o site usa |
|---|---|
| `works` | `id`, `owner_id`, `type` (`comic`, `movie`, `series`, `book`), `title`, `author_name`, `synopsis`, `cover_path`, `video_url`, `created_at` |
| `comic_pages` | `work_id`, `position`, `image_path` |
| `chapters` | `work_id`, `position`, `title`, `body` |
| `episodes` | `work_id`, `position`, `title`, `url` |
| `profiles` | `id` (o mesmo id do usuário), `display_name` |

Para apagar uma obra, o site apaga só a linha em `works`. As tabelas `comic_pages`, `chapters` e `episodes` precisam de `on delete cascade` no `work_id`, senão as páginas e capítulos ficam sobrando no banco.

### Storage

- Bucket: `fliphut`, **público** (as imagens são abertas pelo link direto).
- Cada arquivo fica em `<id do usuário>/<id da obra>/arquivo.jpg` (capa: `cover.jpg`, páginas: `p0001.jpg`, `p0002.jpg`…).
- O site reduz as imagens antes de enviar: capa até 400 KB, cada página até 1,5 MB, no máximo 120 páginas.

### Regras de segurança (RLS)

O site sozinho não protege nada: o botão "Apagar minha obra" só aparece para o dono, mas quem conhece a chave pública pode mandar pedidos direto para o banco. Quem protege são as regras do Supabase. Elas precisam garantir:

| Onde | Ler | Criar | Editar / apagar |
|---|---|---|---|
| `works` | todo mundo | só logado, e só com `owner_id = auth.uid()` | só o dono (`owner_id = auth.uid()`) |
| `comic_pages`, `chapters`, `episodes` | todo mundo | só o dono da obra ligada (`work_id`) | só o dono da obra ligada |
| `profiles` | todo mundo (só `display_name`) | — | só a própria linha |
| Storage `fliphut` | público pelo link | só logado, e só dentro da pasta com o próprio id | só na pasta com o próprio id |

Para ver as regras que estão valendo hoje, rode no **SQL Editor** do Supabase (só lê, não muda nada):

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, cmd;
```

Atenção especial a:

- regra de `insert` em `comic_pages`, `chapters` e `episodes` que só confere se a pessoa está logada: aí qualquer conta consegue pôr páginas ou capítulos na obra de outra pessoa;
- regra do storage que não confere a pasta (`(storage.foldername(name))[1] = auth.uid()::text`): aí qualquer conta consegue apagar ou trocar imagens de outra pessoa;
- tabela com RLS desligado (aparece como "RLS disabled" no Table Editor).

### URLs de redirecionamento

Em **Authentication → URL Configuration**:

- **Site URL**: `https://gaku-093.github.io/FlipHut/`
- **Redirect URLs**: `https://gaku-093.github.io/FlipHut/` e, para testar no computador, `http://localhost:8000/`

Sem isso, o link de confirmação de e-mail, o "esqueci a senha" e o login pelo Google voltam para o endereço errado.

## Ligar o login pelo Google

Hoje o botão aparece, mas o Google está desligado no Supabase: quem clica cai numa página de erro. Até ligar, dá para esconder o botão com `ENABLE_GOOGLE: false` no `config.js`.

1. No [Google Cloud Console](https://console.cloud.google.com/), crie (ou escolha) um projeto.
2. Em **APIs e serviços → Tela de permissão OAuth**, preencha nome do app, e-mail de suporte e publique.
3. Em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**, escolha **Aplicativo da Web**.
4. Em **URIs de redirecionamento autorizados**, cole: `https://srvjbgtkpmnwsmffhycw.supabase.co/auth/v1/callback`
5. Copie o **ID do cliente** e a **Chave secreta do cliente**.
6. No Supabase, em **Authentication → Sign In / Providers → Google**, ligue, cole os dois valores e salve.
7. Deixe `ENABLE_GOOGLE: true` no `config.js`.

## Ligar o login por celular

1. No Supabase, em **Authentication → Sign In / Providers → Phone**, ligue e configure um serviço de SMS (Twilio, MessageBird, Vonage…). Cada SMS é pago a esse serviço.
2. Mude `ENABLE_PHONE` para `true` no `config.js`.

## Publicar

O GitHub Pages publica sozinho a branch `main` (pasta raiz). Depois do `git push`, o site atualiza em um ou dois minutos.
