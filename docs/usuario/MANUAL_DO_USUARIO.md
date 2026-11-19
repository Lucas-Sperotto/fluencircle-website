# Manual do usuário — FluenCircle (main pós-refatoração, versão documentada)

As instruções descrevem o comportamento observado na main após os PRs #2 e #16. Exigem validação funcional em staging antes de serem divulgadas como manual operacional definitivo. Não há capturas de tela oficiais validadas neste pacote.

## 1. Para todos: como entrar

1. Abra a página de acesso (`auth.html`) no domínio oficial da plataforma.
2. Informe o e-mail e a senha cadastrados pela administração.
3. Após a autenticação, a página inicial apresenta atalhos compatíveis com o seu papel.
4. Use **Sair** para encerrar o acesso, especialmente em computadores compartilhados.

**Possíveis mensagens:** credenciais incorretas, acesso revogado, conta sem perfil ou indisponibilidade de conexão. Se o login funcionar mas os atalhos não aparecerem, contate o administrador. Não tente criar uma conta por conta própria: a plataforma prevista é de cadastro administrado.

## 2. Aluno — revisar flashcards

1. Entre no sistema e abra **Flash Cards** (`flash-cards.html`).
2. Serão exibidos os decks de sessões em que sua presença foi registrada, caso contenham flashcards.
3. Observe o indicador de revisão: pendente, disponível ou concluída.
4. Abra um deck e percorra os cartões; ao completar a pilha, o sistema tenta registrar o progresso quando a etapa está liberada.
5. Use os botões da interface para voltar à lista ou reiniciar o estudo.

**Regra atual:** primeira revisão após 24 horas do início da sessão; segunda após 7 dias da conclusão da primeira; terceira após 30 dias da conclusão da segunda. Revisar antes da liberação não deve antecipar a etapa.

**Se não vir um deck:** confirme com o mediador se sua presença foi registrada na sessão. Se houver erro de gravação, tente novamente e relate a mensagem ao suporte.

## 3. Mediador — preparar um tema

1. Entre com papel de mediador ou administrador.
2. Abra **Temas** (`set-meeting.html`).
3. Escolha **Novo Tema**, digite o tópico e inclua pelo menos uma pergunta condutora.
4. Salve. Para alterar, selecione um tema existente; para excluir, use a ação de remoção e confirme.
5. Pode usar aspas, pontuação e caracteres em português normalmente nos campos.

**Boas práticas:** utilize temas curtos, perguntas objetivas e evite armazenar informações pessoais dos participantes nas perguntas.

## 4. Mediador — conduzir sessão de conversação

1. Abra **Conversação** (`presentation.html`).
2. Selecione um tema existente e clique em **Iniciar**.
3. Apresente as perguntas com os controles de navegação; a implementação aceita teclado (setas e espaço), além da interação com a tela.
4. Abra o painel de participantes para marcar a presença dos alunos.
5. Use o tradutor integrado quando precisar; as traduções podem gerar flashcards vinculados à sessão.
6. Ao terminar, use **Encerrar** e confirme.

**Importante:** a versão analisada mantém **uma sessão ativa global** no banco. Não abra duas sessões simultâneas em produção sem antes corrigir a concorrência de `current_session`. Se aparecer o erro ao encerrar, a sessão permanece na tela para uma nova tentativa. O sistema ainda não permite dois mediadores simultâneos com segurança comprovada.

## 5. Mediador — consultar sessões e cards

1. Abra **Sessões** (`manage-meetings.html`).
2. Escolha a sessão no histórico.
3. Consulte os flashcards, adicione novos pares frente/verso, edite-os ou exclua-os conforme necessário.
4. Ao excluir uma sessão, confirme a operação; a intenção do sistema é remover seus flashcards e vínculos de presença.

**Atenção:** a exclusão de sessão ainda precisa de melhorias de consistência e backup. Evite exclusões irreversíveis de dados reais até aprovação do fluxo.

## 6. Visitante — Circle Tradutor

1. Abra a página pública **Circle Tradutor** (`circle-translator.html`).
2. Digite a palavra ou frase no campo de origem, com até 300 caracteres (limite observado na interface).
3. Clique em **Traduzir** e aguarde a resposta.
4. Se houver uma sessão ativa, a versão analisada **tenta salvar automaticamente** a tradução como flashcard da sessão.

**Privacidade:** não coloque senhas, documentos pessoais, informações médicas ou conteúdo sigiloso no tradutor. O serviço faz requisições ao backend de tradução; política de retenção e processamento ainda deve ser formalizada pelos responsáveis. O fluxo automático de gravação pública ainda está sob revisão de segurança.

## 7. Administrador — contas e papéis

1. Entre com papel de administrador e abra **Acessos** (`admin.html`).
2. Pesquise a lista de usuários, se necessário.
3. Clique em **Novo Perfil** para cadastrar nome, sobrenome, e-mail, senha inicial e papel (`student`, `mediator` ou `admin`).
4. Use **Editar Perfil** para corrigir nomes e papel; a edição atual não altera e-mail no Firebase Auth.
5. Use **Excluir Perfil** para revogar o acesso, com confirmação.

**Importante para administradores:** a versão avaliada mantém a conta no Firebase Authentication ao realizar exclusão lógica do perfil. Também pode deixar uma conta Auth órfã se a gravação do perfil falhar. A gestão de usuários deve migrar ao backend antes de ser considerada plenamente robusta.

## 8. Solução de problemas

| Sintoma | Ação inicial segura |
|---|---|
| Página em branco/erro de módulo | Verificar a conexão e se o site está servido por HTTP(S), não `file://` |
| Login recusado | Conferir credenciais e pedir ao admin que verifique a conta |
| Deck ausente | Solicitar verificação da presença e da existência de cards |
| Tradução não aparece | Verificar limite de texto/conexão; repetir sem dados sensíveis |
| Sessão desapareceu | Pedir ao mediador que verifique histórico e estado ativo |
| Operação de exclusão falhou | Não repetir indiscriminadamente; buscar suporte para reconciliar dados |

## 9. Apoio e limites

Este manual cobre apenas as oito páginas que aparecem no ZIP. O contato de suporte oficial, políticas de privacidade, termos de uso e processo de recuperação de senha não foram fornecidos como documentos aprovados; precisam ser definidos antes de divulgar o manual ao público.