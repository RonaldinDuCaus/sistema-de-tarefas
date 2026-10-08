# Em Dia — Tarefas com Firebase

Projeto acadêmico desenvolvido em **HTML, CSS e JavaScript puros**, com Firebase Authentication para cadastro/login e Cloud Firestore para armazenar tarefas em tempo real. Não utiliza React, Angular, servidor próprio ou etapa de compilação.

**Quer começar pelo básico?** Abra [COMECAR.txt](COMECAR.txt). Ele reúne os arquivos, a configuração e os comandos em um guia curto. A interface inclui uma ilustração SVG local em `public/images/tarefas.svg`, sem depender de um serviço de imagens.

## Situação da entrega

O código, as regras do banco, a configuração do Hosting e este guia estão preparados. **Ainda é necessário criar o projeto Firebase, preencher sua configuração, executar os testes abaixo e capturar as evidências reais.** O acesso ao terminal e ao navegador de teste estava indisponível durante a preparação; portanto, não foi possível executar nem validar visualmente esta versão. Não há certificado, prints de funcionamento, publicação ou ZIP já gerados.

## Funcionalidades

- Cadastro e login com e-mail e senha; confirmação de senha no cadastro.
- Logout e sessão preservada ao atualizar a página na mesma aba.
- Criar, listar, editar e excluir tarefas com confirmação de exclusão.
- Marcar tarefas como concluídas ou reabri-las.
- Título, descrição opcional e prioridade (baixa, normal ou alta).
- Busca, filtros de status e contadores.
- Atualização em tempo real com `onSnapshot`.
- Dados separados por usuário e protegidos pelas regras do Firestore.
- Layout adaptável a celular e computador, rótulos de campos e mensagens de estado.
- Aviso de configuração pendente, sem simular login ou dados do Firebase.

## 1. Criar seu projeto Firebase

1. Acesse o [console Firebase](https://console.firebase.google.com/) com sua conta Google.
2. Crie um projeto, por exemplo, **Em Dia Acadêmico**. Google Analytics é opcional e não é usado nesta aplicação.
3. Na visão geral, adicione um aplicativo **Web** (ícone `</>`), com um nome como `em-dia-web`.
4. Copie o objeto `firebaseConfig` mostrado pelo console. Também pode encontrá-lo em **Configurações do projeto → Seus aplicativos → Configuração do SDK**.
5. Abra `public/firebase-config.js` e substitua os valores de exemplo pelos valores do seu projeto, preservando `export const firebaseConfig =`.

Exemplo de estrutura (estes valores não funcionam; use os seus):

```js
export const firebaseConfig = {
  apiKey: "valor-copiado-do-console",
  authDomain: "seu-id.firebaseapp.com",
  projectId: "seu-id",
  appId: "valor-copiado-do-console"
};
```

Se o objeto incluir `storageBucket`, `messagingSenderId` ou `measurementId`, você pode mantê-los. Estes serviços não são usados pelo projeto. A configuração web é pública; a autorização dos dados depende das regras do banco. Não coloque senhas, chaves privadas ou credenciais de conta de serviço no código.

## 2. Ativar cadastro e login

1. No console, abra **Authentication → Começar / Get started**.
2. Em **Método de login / Sign-in method**, habilite **E-mail/senha** e salve. Não é necessário habilitar login por link.
3. Em **Configurações → Domínios autorizados**, confira se `localhost` está presente e adicione se necessário.
4. A aplicação exige pelo menos seis caracteres no cadastro. Se definir uma política mais forte no console, as senhas deverão atender a essa política também.

## 3. Criar e proteger o Cloud Firestore

1. Abra **Firestore Database → Criar banco de dados**.
2. Use o banco **padrão `(default)`**, edição Standard se houver escolha, e selecione uma região adequada.
3. Escolha **modo de produção**.
4. Na aba **Regras / Rules**, substitua o conteúdo pelo arquivo `firestore.rules` deste projeto e clique em **Publicar**.
5. Não é necessário criar coleções manualmente. A primeira tarefa cria os documentos necessários.

As regras permitem que cada pessoa leia e modifique somente `/users/SEU_UID/tasks`. Também validam campos, tipos, tamanho do título/descrição, prioridade e datas. O cliente não pode alterar a data original de criação. Não use uma regra global de acesso público.

## 4. Executar localmente

É necessário um navegador moderno e internet para carregar o SDK e acessar o Firebase. Escolha **uma** alternativa.

### Alternativa A — VS Code

1. Abra a pasta `tarefas-firebase` no Visual Studio Code.
2. Instale a extensão **Live Server**, de Ritwick Dey, se ainda não a tiver.
3. Clique com o botão direito em `public/index.html` e escolha **Open with Live Server**.
4. Use a URL `http://localhost:5500/public/` caso a extensão abra em `127.0.0.1`, ajustando a porta conforme o servidor.

### Alternativa B — Python instalado

Abra o terminal **na pasta `tarefas-firebase`** e execute:

```powershell
py -m http.server 5500 --bind 127.0.0.1 --directory public
```

Abra [http://localhost:5500](http://localhost:5500). Para encerrar, pressione `Ctrl+C` no terminal. Se seu sistema usa o comando `python`, substitua `py` por `python`.

Não abra o HTML por duplo clique (`file://`): a aplicação usa módulos JavaScript e precisa ser servida por HTTP. Depois de alterar a configuração Firebase, atualize a página.

## 5. Usar a aplicação

1. Escolha **Criar conta**, informe e-mail, senha e confirmação.
2. Após o cadastro, a lista pessoal será aberta automaticamente.
3. Adicione uma tarefa como **Concluir atividade de Firebase**.
4. Use **Editar** para alterar título, detalhes ou prioridade.
5. Marque a caixa ao lado da tarefa para concluí-la; desmarque para reabrir.
6. Use **Excluir** e confirme para remover definitivamente.
7. Use **Sair da conta** e entre novamente para verificar a persistência no banco.

O indicador informa quando os dados estão sincronizados ou aguardando conexão/gravação. Escritas offline podem permanecer pendentes até a rede retornar; a mensagem de sucesso só aparece depois da confirmação do servidor. Não há persistência offline em disco configurada. Se duas abas editarem o mesmo campo, prevalece a última gravação aceita pelo Firestore.

### Como o Firebase é importado no JavaScript

As importações são código JavaScript, não comandos para colar no PowerShell. No projeto, `app.js` já carrega os três módulos abaixo dentro de `initialize()`:

```js
const [appAPI, authAPI, dbAPI] = await Promise.all([
  import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')
]);
```

O trecho abaixo ilustra a ligação entre a configuração e os serviços. Essa inicialização também já está implementada; não precisa adicioná-la uma segunda vez:

```js
const app = appAPI.initializeApp(firebaseConfig);
const auth = authAPI.getAuth(app);
const db = dbAPI.getFirestore(app);
```

As funções principais utilizadas são:

| Requisito | Função do SDK |
| --- | --- |
| Cadastro | `createUserWithEmailAndPassword(auth, email, password)` |
| Login | `signInWithEmailAndPassword(auth, email, password)` |
| Logout | `signOut(auth)` |
| Criar tarefa | `addDoc(colecao, dados)` |
| Ler em tempo real | `onSnapshot(consulta, callback)` |
| Atualizar tarefa | `updateDoc(documento, alteracoes)` |
| Excluir tarefa | `deleteDoc(documento)` |

O HTML conecta os estilos com `<link rel="stylesheet" href="styles.css">` e o JavaScript com `<script type="module" src="app.js"></script>`. Não há comando para compilar HTML ou CSS: o navegador interpreta esses arquivos diretamente.

## 6. Testes e evidências para a entrega

Execute este roteiro **depois de configurar os serviços**. Os itens abaixo são testes propostos, não resultados já obtidos.

| Ação | Resultado esperado | Evidência sugerida |
| --- | --- | --- |
| Cadastrar uma conta nova | Painel abre; usuário aparece no Authentication | `01-cadastro.png` e `02-authentication.png` |
| Sair e entrar com senha errada | Mensagem de erro sem abrir o painel | `03-erro-login.png` |
| Entrar com a senha correta | Lista da conta é carregada | `04-login.png` |
| Criar uma tarefa | Item aparece na lista e no Firestore | `05-criacao.png` e `06-firestore.png` |
| Editar título e prioridade | Mudança é persistida após atualizar a página | `07-edicao.png` |
| Concluir e reabrir tarefa | Status e contadores mudam | `08-conclusao.png` |
| Abrir duas abas e entrar na mesma conta em ambas | Criar/editar/excluir em uma atualiza a outra sem recarregar | `09-tempo-real.png` ou vídeo |
| Cancelar a exclusão | Tarefa permanece | Registrar no vídeo ou anotações |
| Confirmar a exclusão | Tarefa some da interface e do banco | `10-exclusao.png` |
| Criar uma segunda conta | Ela começa sem as tarefas da primeira | `11-isolamento.png` |
| Sair da conta | Painel e tarefas deixam de aparecer | `12-logout.png` |
| Usar no celular ou janela estreita | Formulários e botões permanecem utilizáveis | `13-celular.png` |

Para verificar **autorização**, use o simulador de regras do console Firestore, se disponível:

- Uma leitura de `/users/UID_A/tasks/ID_REAL` autenticada como `UID_A` deve ser permitida.
- A mesma leitura autenticada como `UID_B` ou sem autenticação deve ser negada.
- Uma gravação com campos extras, título vazio ou prioridade inválida deve ser negada.

A segunda conta ver uma lista vazia comprova separação na interface; os testes de regras verificam a proteção de acesso direto. Não altere as regras para facilitar os prints.

Salve as capturas reais na pasta `evidencias`. Não capture o campo de senha. Para um vídeo de 2–3 minutos: mostre cadastro, logout/login, criação, edição, conclusão, atualização entre abas, exclusão e o documento no console. Identifique que o projeto usa Authentication e Firestore.

## 7. Publicar no Firebase Hosting (opcional)

O arquivo `firebase.json` já aponta para `public` e referencia as regras. Com Node.js e npm instalados, execute na pasta `tarefas-firebase`:

```powershell
npm install -g firebase-tools
firebase login
firebase projects:list
firebase deploy --only firestore:rules,hosting --project SEU_ID_REAL_DO_PROJETO
```

Substitua `SEU_ID_REAL_DO_PROJETO` pelo **ID** exibido no console, igual ao `projectId` da configuração. A publicação aplica as regras deste trabalho ao projeto selecionado; use o projeto dedicado que você criou para esta atividade. Não precisa executar `firebase init` nem substituir os arquivos existentes.

Abra a URL exibida pelo comando, confira o domínio em Authentication → Domínios autorizados e repita os testes de login e CRUD no site publicado. Registre a URL na entrega. Nenhuma publicação foi realizada durante a preparação deste código.

## 8. Curso e certificado

Faça o curso [HTML, CSS, JavaScript e Firebase: Seja um FullStack developer](https://cursa.app/cursos-gratuitos-online/firebase) indicado na atividade, incluindo aulas e exercícios. Na consulta de 08/10/2026, a listagem apresentava **3h51m de conteúdo e 29 exercícios**; confirme a carga horária no certificado emitido.

Use o aplicativo Cursa para obter o certificado após cumprir os requisitos. Entregue o **documento verdadeiro emitido para você**. Se o aplicativo salvar em imagem, exporte ou imprima essa imagem em PDF preservando nome, carga horária e dados de validação. Este projeto não inclui nem comprova a conclusão do curso.

Uma organização possível para as seis horas da atividade é: 3h51m de aulas, 2h de projeto e 9min de organização da entrega. Exercícios e ajustes podem exigir tempo adicional; registre as horas conforme orientação do professor.

## 9. Gerar o ZIP e entregar

Depois de testar e acrescentar as evidências, abra o PowerShell na pasta `tarefas-firebase` e execute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\gerar-zip.ps1
```

O script cria `tarefas-firebase-DATA-HORA.zip` na pasta acima, sem sobrescrever entregas anteriores. A opção de execução vale apenas para esse processo. Alternativamente, no Explorador de Arquivos, clique com o botão direito na pasta `tarefas-firebase` e escolha **Compactar para arquivo ZIP**.

Checklist final:

- [ ] Certificado autêntico do Cursa em PDF, entregue separadamente.
- [ ] Configuração preenchida e regras publicadas no projeto correto.
- [ ] Testes reais de autenticação, CRUD, tempo real e isolamento concluídos.
- [ ] Prints ou vídeo reais na pasta `evidencias`.
- [ ] ZIP do código com README (ou link de repositório com os mesmos arquivos).
- [ ] Link do Firebase Hosting, se a publicação opcional foi realizada.

## Estrutura e funcionamento

```text
tarefas-firebase/
  public/
    index.html          Interface e formulários
    styles.css          Estilos responsivos
    app.js              Autenticação, estado da tela e CRUD
    firebase-config.js  Configuração pública do seu app
  evidencias/
    LEIA-ME.txt         Orientações para as capturas reais
  firestore.rules       Autorização e validação do banco
  firebase.json         Configuração de publicação
  gerar-zip.ps1          Empacotamento para entrega
  README.md             Este documento
```

Os dados ficam em `users/{uid}/tasks/{taskId}`. Cada tarefa contém `title`, `description`, `priority`, `done`, `createdAt` e `updatedAt`. As datas são geradas com `serverTimestamp()`. As senhas são tratadas pelo Firebase Authentication e não são gravadas nos documentos.

No `app.js`, `initialize()` conecta o SDK; `onSessionChanged()` alterna a tela e assina a coleção do usuário; `render()` monta a lista; `mutate()` controla as gravações. O evento de envio do formulário usa `addDoc`/`updateDoc`; os botões usam `updateDoc`/`deleteDoc`. O listener anterior é encerrado ao trocar de sessão. Títulos e descrições são inseridos com `textContent`, impedindo que conteúdo digitado seja interpretado como HTML.

O SDK modular é carregado diretamente do CDN oficial, com versão fixada em `13.0.0`. O projeto utiliza o módulo completo de Firestore para suportar os listeners em tempo real.

## Solução de problemas

| Sintoma | O que conferir |
| --- | --- |
| Aviso de configuração pendente | Substituir todos os valores de exemplo em `firebase-config.js` |
| Falha ao iniciar | Abrir por HTTP; conferir sintaxe da configuração e acesso a `www.gstatic.com` |
| Cadastro/login não permitido | Habilitar E-mail/senha em Authentication |
| Acesso negado ao banco | Publicar `firestore.rules` no mesmo projeto da configuração |
| Não carrega tarefas | Criar Cloud Firestore `(default)` e conferir internet e permissões |
| Domínio não autorizado | Adicionar `localhost` ou o domínio publicado às configurações de Authentication |
| Gravação aguardando | Restaurar conexão e aguardar confirmação do Firestore |
| Dados de outra conta não aparecem | Comportamento esperado: cada UID tem sua própria coleção |

## Referências

- [Configurar Firebase na aplicação web](https://firebase.google.com/docs/web/setup)
- [Autenticação por e-mail e senha](https://firebase.google.com/docs/auth/web/password-auth)
- [Listeners em tempo real no Firestore](https://firebase.google.com/docs/firestore/query-data/listen)
- [Condições das regras de segurança](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Publicar no Firebase Hosting](https://firebase.google.com/docs/hosting/quickstart)

Documentação consultada em 08/10/2026.
