PROTÓTIPO — APOIA+
Abra index.html no navegador para visualizar.

PÁGINAS
- index.html            página inicial
- login.html             entrar
- cadastro.html          criar cadastro de participante
- perfil.html            perfil do participante (dados, cursos, agenda)
- cursos.html            catálogo de cursos
- curso-detalhe.html     detalhe de um curso (?c=informatica, trabalho, espanhol,
                          informatica-avancada, empreendedorismo, frances)
- agenda.html             agenda de estudos, atendimentos e visitas
- notificacoes.html       central de notificações
- organizacao.html        cadastro de organização parceira
- org-painel.html         painel da organização (cursos, alunos, status do cadastro)
- admin.html              painel administrativo (aprovar organizações, ver participantes e cursos)
- style.css               estilo visual compartilhado por todas as páginas
- app.js                  simulação de app (login, inscrições, agenda, notificações, admin)

COMO FUNCIONA AGORA (ainda sem servidor)
Este protótipo já se comporta como um site funcional: dá para criar uma conta,
"logar", se inscrever em cursos, marcar compromissos na agenda e ver
notificações. Tudo isso é simulado com localStorage no navegador (arquivo
app.js), ou seja, os dados ficam salvos só no seu próprio navegador — não
existe servidor nem banco de dados de verdade ainda, e nada disso é visível
para outras pessoas.

Importante: não existe forma real de "esconder" HTML/CSS/JS do F12 ou
Ctrl+U — o navegador sempre precisa desse código para exibir a página. A
proteção de verdade (dados de usuários, senhas, regras de negócio) só
existe quando essa lógica está em um servidor e banco de dados reais, fora
do alcance do navegador.

IDIOMA
O seletor no cabeçalho já traduz a interface de verdade (menus, botões,
títulos, textos principais, formulários) entre português, espanhol, inglês,
francês e árabe (com layout da direita para a esquerda no árabe). A escolha
fica salva no navegador e vale para todas as páginas. O que ainda fica em
português: os dados de exemplo gerados dinamicamente (como "Módulo 3 de 6"
no perfil) — isso é conteúdo de demonstração, não texto fixo da interface.

PAINÉIS
- admin.html: acesso restrito (qualquer nome/e-mail entra, é só protótipo). Lá dá
  para aprovar ou rejeitar organizações, e ver a lista de participantes e cursos.
- org-painel.html: acessado ao cadastrar uma organização em organizacao.html, ou
  clicando em "Entrar como organização" em login.html. Mostra cursos da
  organização e permite adicionar um novo curso (fica salvo só no navegador).

PRÓXIMA ETAPA — transformar em aplicação real
- backend e banco de dados (substituir o app.js simulado por uma API real)
- login seguro com senha criptografada, com permissões reais para admin/organização/aluno
- perfis de participantes persistidos no banco
- fluxo de aprovação de organizações com notificação por e-mail
- cursos e inscrições com controle de vagas
- agenda de estudos e visitas com confirmação por atendente
- notificações reais (push / e-mail / SMS)
- tradução dos conteúdos gerados dinamicamente (hoje só a interface fixa é traduzida)
- proteção de dados e consentimentos (RGPD e LOPDGDD — legislação espanhola)

Cada bloco de funções em app.js tem um comentário indicando qual chamada
de servidor (ex: "viraria POST /api/login") deveria substituí-lo quando o
backend existir.
