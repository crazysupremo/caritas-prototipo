/* =========================================================================
   Apoia+ — camada de simulação de aplicação (protótipo sem backend)
   -------------------------------------------------------------------------
   Este arquivo concentra toda a "lógica de app" usando localStorage no
   navegador. Serve para o protótipo parecer e se comportar como um site
   de verdade (login, inscrição em cursos, agenda, notificações) enquanto
   o backend real não existe.

   Quando o backend for construído, cada método abaixo deve virar uma
   chamada de API real (fetch). Deixamos marcado com "// API:" o que cada
   função representaria no sistema final, para facilitar a migração.
   ========================================================================= */

const CARITAS = {
  KEY_USER: 'caritas_user',
  KEY_ENROLLMENTS: 'caritas_enrollments',
  KEY_APPOINTMENTS: 'caritas_appointments',
  KEY_NOTIF_READ: 'caritas_notif_read',
  KEY_NOTIF_DYNAMIC: 'caritas_notif_dynamic',
  KEY_ORGANIZATIONS: 'caritas_organizations',
  KEY_PARTICIPANTS: 'caritas_participants',

  /* ---------------- catálogo de cursos (viraria GET /api/cursos) ---------------- */
  courses: {
    'informatica': {
      id:'informatica', tag:'Profissionalizante', title:'Informática Básica',
      summary:'Curso introdutório para desenvolver competências digitais essenciais para o dia a dia e o mercado de trabalho.',
      description:'Este curso apresenta os fundamentos do uso de computadores: sistema operacional, navegação segura na internet, edição de documentos e comunicação por e-mail. Ideal para quem está começando ou quer reforçar conhecimentos básicos.',
      modules:['Uso do sistema operacional e organização de arquivos','Navegação segura e pesquisa na internet','Edição de textos e planilhas simples','E-mail e comunicação digital'],
      format:'Presencial', duration:'6 semanas', hours:'2h / semana', vacancies:'12 disponíveis', start:'29/09/2026',
      color:'linear-gradient(135deg,#0c8c66,#71b89e)'
    },
    'trabalho': {
      id:'trabalho', tag:'Empregabilidade', title:'Preparação para o Trabalho',
      summary:'Orientações práticas para currículo, entrevistas e busca de emprego.',
      description:'Um curso prático voltado para quem está buscando (re)colocação no mercado de trabalho: como montar um currículo, se preparar para entrevistas e usar plataformas de vagas com confiança.',
      modules:['Como montar um currículo eficiente','Simulação de entrevistas de emprego','Busca de vagas e plataformas online','Direitos trabalhistas básicos'],
      format:'Online', duration:'4 semanas', hours:'1h30 / semana', vacancies:'20 disponíveis', start:'22/09/2026',
      color:'linear-gradient(135deg,#335f9d,#8fb5e2)'
    },
    'espanhol': {
      id:'espanhol', tag:'Idiomas', title:'Espanhol para Iniciantes',
      summary:'Primeiros passos para comunicação no dia a dia em espanhol.',
      description:'Curso introdutório de espanhol com foco em comunicação prática: apresentações, situações cotidianas e vocabulário essencial.',
      modules:['Apresentação pessoal e cumprimentos','Situações do dia a dia (mercado, transporte)','Vocabulário essencial de trabalho','Prática de conversação'],
      format:'Presencial', duration:'8 semanas', hours:'2h / semana', vacancies:'15 disponíveis', start:'06/10/2026',
      color:'linear-gradient(135deg,#b37a32,#e9c47d)'
    },
    'informatica-avancada': {
      id:'informatica-avancada', tag:'Profissionalizante', title:'Informática Avançada',
      summary:'Planilhas, apresentações e ferramentas de produtividade.',
      description:'Aprofunda o uso de planilhas eletrônicas, apresentações e ferramentas de produtividade usadas no dia a dia profissional.',
      modules:['Planilhas: fórmulas e organização de dados','Apresentações profissionais','Ferramentas de produtividade em nuvem','Boas práticas de segurança digital'],
      format:'Online', duration:'6 semanas', hours:'2h / semana', vacancies:'10 disponíveis', start:'13/10/2026',
      color:'linear-gradient(135deg,#5c4b9e,#a89be0)'
    },
    'empreendedorismo': {
      id:'empreendedorismo', tag:'Empregabilidade', title:'Introdução ao Empreendedorismo',
      summary:'Primeiros passos para abrir e organizar um pequeno negócio.',
      description:'Um panorama prático sobre como estruturar uma ideia de negócio, organizar finanças básicas e formalizar um pequeno empreendimento.',
      modules:['Como validar uma ideia de negócio','Organização financeira básica','Formalização (MEI e alternativas)','Divulgação e primeiros clientes'],
      format:'Presencial', duration:'5 semanas', hours:'2h / semana', vacancies:'18 disponíveis', start:'20/10/2026',
      color:'linear-gradient(135deg,#0c8c66,#c7e6ab)'
    },
    'frances': {
      id:'frances', tag:'Idiomas', title:'Francês para Iniciantes',
      summary:'Comunicação básica para o dia a dia e o trabalho.',
      description:'Curso introdutório de francês com foco em comunicação prática para situações cotidianas e de trabalho.',
      modules:['Apresentação pessoal e cumprimentos','Situações do dia a dia','Vocabulário de trabalho','Prática de conversação'],
      format:'Presencial', duration:'8 semanas', hours:'2h / semana', vacancies:'14 disponíveis', start:'27/10/2026',
      color:'linear-gradient(135deg,#9d3352,#e08fa8)'
    }
  },

  /* ---------------- sessão / usuário (viraria POST /api/login, /api/logout) ---------------- */
  getUser(){ try{ return JSON.parse(localStorage.getItem(this.KEY_USER)); }catch(e){ return null; } },
  setUser(u){ localStorage.setItem(this.KEY_USER, JSON.stringify(u)); },
  logout(){ localStorage.removeItem(this.KEY_USER); location.href = 'index.html'; },
  requireLogin(nextPage){
    if(!this.getUser()){ location.href = 'login.html' + (nextPage ? ('?next=' + encodeURIComponent(nextPage)) : ''); return false; }
    return true;
  },

  /* ---------------- inscrições em cursos (viraria POST /api/inscricoes) ---------------- */
  getEnrollments(){ try{ return JSON.parse(localStorage.getItem(this.KEY_ENROLLMENTS)) || []; }catch(e){ return []; } },
  isEnrolled(courseId){ return this.getEnrollments().some(c => c.id === courseId); },
  enroll(courseId, courseName){
    const list = this.getEnrollments();
    if(!list.find(c => c.id === courseId)){
      list.push({ id: courseId, name: courseName, date: new Date().toISOString() });
      localStorage.setItem(this.KEY_ENROLLMENTS, JSON.stringify(list));
      this.pushNotification('Inscrição confirmada', `Você se inscreveu em "${courseName}".`);
    }
    return list;
  },

  /* ---------------- agenda (viraria POST /api/agendamentos) ---------------- */
  getAppointments(){ try{ return JSON.parse(localStorage.getItem(this.KEY_APPOINTMENTS)) || []; }catch(e){ return []; } },
  addAppointment(a){
    const list = this.getAppointments();
    list.push(a);
    localStorage.setItem(this.KEY_APPOINTMENTS, JSON.stringify(list));
    this.pushNotification('Agendamento confirmado', `${a.tipo} marcado para ${a.dia} às ${a.hora}.`);
    return list;
  },

  /* ---------------- organizações (viraria POST/GET /api/organizacoes) ---------------- */
  getOrganizations(){ try{ return JSON.parse(localStorage.getItem(this.KEY_ORGANIZATIONS)) || []; }catch(e){ return []; } },
  registerOrganization(data){
    const list = this.getOrganizations();
    const org = Object.assign({
      id: 'org' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
      status: 'pendente',
      createdAt: new Date().toISOString()
    }, data);
    list.push(org);
    localStorage.setItem(this.KEY_ORGANIZATIONS, JSON.stringify(list));
    this.pushNotification('Cadastro enviado', `A organização "${data.nome}" foi enviada para análise.`);
    return org;
  },
  setOrganizationStatus(id, status){
    const list = this.getOrganizations();
    const org = list.find(o => o.id === id);
    if(org){ org.status = status; localStorage.setItem(this.KEY_ORGANIZATIONS, JSON.stringify(list)); }
    return org;
  },

  /* ---------------- participantes (viraria GET /api/participantes) ---------------- */
  getParticipants(){ try{ return JSON.parse(localStorage.getItem(this.KEY_PARTICIPANTS)) || []; }catch(e){ return []; } },
  registerParticipant(data){
    const list = this.getParticipants();
    const p = Object.assign({
      id: 'p' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
      createdAt: new Date().toISOString()
    }, data);
    list.push(p);
    localStorage.setItem(this.KEY_PARTICIPANTS, JSON.stringify(list));
    return p;
  },

  /* ---------------- notificações (viraria GET /api/notificacoes) ---------------- */
  baseNotifications(){
    return [
      { id:'n1', title:'Bem-vindo(a) à Apoia+', body:'Complete seu cadastro para ver recomendações personalizadas de cursos.', date:'2026-09-10' },
      { id:'n2', title:'Novo curso disponível', body:'Informática Avançada já está com inscrições abertas.', date:'2026-09-12' },
      { id:'n3', title:'Atendimento amanhã', body:'Você tem um atendimento agendado para amanhã às 15:30.', date:'2026-09-14' }
    ];
  },
  getNotifications(){
    let dynamic = [];
    try{ dynamic = JSON.parse(localStorage.getItem(this.KEY_NOTIF_DYNAMIC)) || []; }catch(e){}
    return [...dynamic, ...this.baseNotifications()];
  },
  pushNotification(title, body){
    let dynamic = [];
    try{ dynamic = JSON.parse(localStorage.getItem(this.KEY_NOTIF_DYNAMIC)) || []; }catch(e){}
    dynamic.unshift({ id: 'd' + Date.now() + '-' + Math.random().toString(36).slice(2,8), title, body, date: new Date().toISOString().slice(0,10) });
    localStorage.setItem(this.KEY_NOTIF_DYNAMIC, JSON.stringify(dynamic));
  },
  getReadIds(){ try{ return JSON.parse(localStorage.getItem(this.KEY_NOTIF_READ)) || []; }catch(e){ return []; } },
  markRead(id){
    const read = this.getReadIds();
    if(!read.includes(id)){ read.push(id); localStorage.setItem(this.KEY_NOTIF_READ, JSON.stringify(read)); }
  },
  markAllRead(){
    const ids = this.getNotifications().map(n => n.id);
    localStorage.setItem(this.KEY_NOTIF_READ, JSON.stringify(ids));
  },
  unreadCount(){
    const read = this.getReadIds();
    return this.getNotifications().filter(n => !read.includes(n.id)).length;
  },

  /* ---------------- helpers de interface (header, menu mobile) ---------------- */
  initHeader(){
    const dict = this.dict();
    const user = this.getUser();
    const authSlot = document.getElementById('authSlot');
    if(authSlot){
      if(user){
        const initials = (user.nome || 'Participante').trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase();
        authSlot.innerHTML =
          '<a class="headicon" href="notificacoes.html" title="' + dict.nav_notificacoes + '" aria-label="' + dict.nav_notificacoes + '">🔔<span class="badge-dot" id="notifDot"></span></a>' +
          '<a class="userchip" href="perfil.html"><span class="avatar" style="width:32px;height:32px;font-size:12px">' + initials + '</span><span class="uname">' + (user.nome || 'Minha conta').split(' ')[0] + '</span></a>' +
          '<button class="btn ghost" type="button" onclick="CARITAS.logout()">' + dict.btn_sair + '</button>';
      } else {
        authSlot.innerHTML = '<a class="btn light" href="login.html">' + dict.btn_entrar + '</a><a class="btn primary" href="cadastro.html">' + dict.btn_cadastrar + '</a>';
      }
    }
    const dot = document.getElementById('notifDot');
    if(dot){
      const n = this.unreadCount();
      if(n > 0){ dot.textContent = n > 9 ? '9+' : String(n); dot.style.display = 'flex'; }
      else { dot.style.display = 'none'; }
    }
    const toggle = document.getElementById('menuToggle');
    const navlinks = document.querySelector('.navlinks');
    if(toggle && navlinks){
      toggle.addEventListener('click', () => navlinks.classList.toggle('open'));
    }
    const langSel = document.getElementById('langSelect');
    if(langSel){
      langSel.value = this.getLang();
      langSel.addEventListener('change', (e) => this.setLang(e.target.value));
    }
  },

  /* ================= i18n — tradução real da interface ================= */
  KEY_LANG: 'caritas_lang',
  getLang(){ return localStorage.getItem(this.KEY_LANG) || 'pt'; },
  dict(lang){ return this.translations[lang || this.getLang()] || this.translations.pt; },
  setLang(lang){
    localStorage.setItem(this.KEY_LANG, lang);
    this.applyTranslations();
    this.initHeader();
  },
  applyTranslations(){
    const dict = this.dict();
    document.documentElement.lang = this.getLang() === 'ar' ? 'ar' : this.getLang();
    document.documentElement.dir = this.getLang() === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if(dict[key] !== undefined) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if(dict[key] !== undefined) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if(dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if(dict[key] !== undefined) document.title = dict[key];
    });
  },

  translations: {
    pt: {
      nav_inicio:'Início', nav_servicos:'Serviços', nav_cursos:'Cursos', nav_organizacoes:'Organizações', nav_sobre:'Sobre',
      nav_agenda:'Agenda', nav_perfil:'Meu perfil', nav_notificacoes:'Notificações',
      btn_entrar:'Entrar', btn_cadastrar:'Cadastrar', btn_sair:'Sair',
      footer_desc:'Plataforma de oportunidades e apoio.', footer_links:'Privacidade · Termos · Ajuda',

      hero_eyebrow:'Uma rede para conectar pessoas e oportunidades',
      hero_title:'Encontre apoio, estudos e novas oportunidades.',
      hero_desc:'Uma plataforma central para pessoas, empresas e organizações. Agende atendimentos e visitas, descubra cursos e mantenha seu perfil sempre atualizado.',
      hero_cta1:'Criar meu cadastro', hero_cta2:'Ver cursos',
      hero_card_title:'Próximo atendimento', hero_card_sub:'Orientação profissional', hero_card_time:'Hoje · 15:30 · Atendimento presencial', hero_card_btn:'Ver agenda',
      hero_profile_label:'Meu perfil', hero_profile_sub:'Cadastro completo · 92%',

      servicos_title:'Uma plataforma para facilitar o acesso', servicos_sub:'Tudo organizado em um só lugar.',
      feat_agendar_title:'Agendar estudos', feat_agendar_desc:'Escolha um curso, horário e formato de estudo de maneira simples.',
      feat_visitas_title:'Marcar visitas', feat_visitas_desc:'Solicite e acompanhe visitas e atendimentos com informações claras.',
      feat_org_title:'Organizações', feat_org_desc:'Empresas e entidades podem criar um perfil e publicar oportunidades.',

      cursos_title:'Cursos e oportunidades', cursos_sub:'Exemplo de como as oportunidades poderão aparecer.', ver_todos:'Ver todos →',
      tag_gratuito:'Gratuito', btn_detalhes:'Detalhes',
      curso_informatica_nome:'Informática Básica', curso_informatica_desc:'Curso introdutório para desenvolver competências digitais.',
      curso_trabalho_nome:'Preparação para o Trabalho', curso_trabalho_desc:'Orientações práticas para currículo e entrevistas.',
      curso_espanhol_nome:'Espanhol para Iniciantes', curso_espanhol_desc:'Primeiros passos para comunicação no dia a dia.',
      curso_informatica_avancada_nome:'Informática Avançada', curso_informatica_avancada_desc:'Planilhas, apresentações e ferramentas de produtividade.',
      curso_empreendedorismo_nome:'Introdução ao Empreendedorismo', curso_empreendedorismo_desc:'Primeiros passos para abrir um pequeno negócio.',
      curso_frances_nome:'Francês para Iniciantes', curso_frances_desc:'Comunicação básica para o dia a dia e trabalho.',

      cta_title:'Sua organização também pode participar', cta_desc:'Cadastre sua empresa ou organização e disponibilize cursos, formações e oportunidades para a comunidade.', cta_btn:'Cadastrar organização',

      sobre_title:'Perfil do participante', sobre_sub:'No cadastro, a pessoa terá um perfil padronizado e fácil de atualizar.',
      feat_foto_title:'Foto de perfil', feat_foto_desc:'Upload com padrão visual único para manter a plataforma organizada.',
      feat_dados_title:'Dados essenciais', feat_dados_desc:'Nome, telefone, data de nascimento e outras informações necessárias.',
      feat_multilang_title:'Multilíngue', feat_multilang_desc:'Português, espanhol, inglês, francês e árabe, com interface preparada para expansão.',

      login_eyebrow:'Bem-vindo de volta', login_title:'Entrar na plataforma', login_sub:'Acesse seu perfil, cursos e agenda.',
      label_nome_proto:'Nome (para o protótipo)', label_email_ou_tel:'E-mail ou telefone', label_senha:'Senha',
      remember_me:'Lembrar de mim', forgot_pass:'Esqueci minha senha', or_divider:'ou', btn_org_login:'Entrar como organização',
      no_account:'Ainda não tem cadastro?', criar_conta:'Criar conta', ja_tem_cadastro:'Já tem cadastro?',

      cadastro_eyebrow:'Cadastro de participante', cadastro_title:'Vamos criar seu perfil', cadastro_sub:'Essas informações ajudam a personalizar cursos, agenda e atendimentos.',
      label_foto:'Foto de perfil', upload_hint:'Envie uma foto para o padrão visual da plataforma',
      label_nome_completo:'Nome completo', label_nascimento:'Data de nascimento', label_telefone:'Telefone / WhatsApp', label_email:'E-mail',
      label_pais:'País de origem', label_idioma:'Idioma preferido', label_cidade:'Cidade atual', label_sobre:'Sobre você',
      sobre_placeholder:'Conte um pouco sobre você, seus interesses e objetivos',
      termos_consent:'Li e aceito os Termos de Uso e a Política de Privacidade, e consinto com o tratamento dos meus dados conforme o RGPD e a LOPDGDD (legislação espanhola de proteção de dados).',
      btn_cancelar:'Cancelar', btn_continuar:'Continuar',

      catalogo_eyebrow:'Catálogo', catalogo_sub:'Encontre um curso gratuito para desenvolver novas competências.',
      busca_placeholder:'Buscar por curso, área ou palavra-chave',
      filtro_todos:'Todos', filtro_profissionalizante:'Profissionalizante', filtro_empregabilidade:'Empregabilidade', filtro_idiomas:'Idiomas', filtro_presencial:'Presencial', filtro_online:'Online',

      info_formato:'Formato', info_duracao:'Duração', info_carga:'Carga horária', info_vagas:'Vagas', info_inicio:'Início',
      btn_inscrever:'Inscrever-se', btn_inscrito:'Inscrito ✓', btn_ver_agenda:'Ver na agenda',
      sobre_curso:'Sobre o curso', vai_aprender:'O que você vai aprender',

      agenda_eyebrow:'Meus compromissos', agenda_title:'Agenda de estudos e visitas', agenda_sub:'Acompanhe seus horários ou marque um novo atendimento.',
      agenda_hint:'Selecione um dia para ver os horários disponíveis.', agenda_novo:'Marcar novo compromisso',
      label_tipo:'Tipo', label_horario:'Horário preferido', btn_confirmar_agendamento:'Confirmar agendamento', meus_horarios:'Meus horários',
      guest_banner_agenda:'Faça login para confirmar agendamentos com o seu nome.',

      guest_banner_perfil:'Você está vendo um perfil de exemplo. Faça login para ver o seu de verdade.',
      btn_editar_perfil:'Editar perfil', stat_cursos:'Cursos inscritos', stat_agenda:'Compromissos agendados', stat_completo:'Cadastro completo', stat_certificados:'Certificados',
      meus_cursos:'Meus cursos', ver_todos_cursos:'Ver todos os cursos', proximos_atendimentos:'Próximos atendimentos', ver_agenda_completa:'Ver agenda completa',
      dados_pessoais:'Dados pessoais', d_telefone:'Telefone', d_email:'E-mail', d_nascimento:'Data de nascimento', d_idioma:'Idioma preferido',

      notif_eyebrow:'Central de avisos', notif_title:'Notificações', notif_sub:'Cursos, agendamentos e novidades da plataforma.',
      btn_marcar_lidas:'Marcar todas como lidas', notif_empty:'Nenhuma notificação por enquanto.',

      org_eyebrow:'Para empresas e entidades', org_title:'Sua organização também pode participar.',
      org_desc:'Cadastre sua empresa, ONG ou entidade parceira, publique cursos e oportunidades, e acompanhe participantes em um só lugar.',
      org_panel_title:'Painel da organização', org_panel_name:'Apoia+ Formação Profissional', org_panel_stats:'4 cursos ativos · 128 inscritos',
      org_verified:'Perfil verificado', org_verified_sub:'Documentação completa',
      org_feat1_title:'Publique cursos', org_feat1_desc:'Anuncie cursos, formações e oportunidades para a comunidade atendida.',
      org_feat2_title:'Gerencie inscritos', org_feat2_desc:'Acompanhe quem se inscreveu e o progresso de cada participante.',
      org_feat3_title:'Relatórios simples', org_feat3_desc:'Veja o impacto da sua organização com dados claros e atualizados.',
      org_form_eyebrow:'Cadastro de organização', org_form_title:'Cadastre sua organização', org_form_sub:'Nossa equipe analisa e verifica o cadastro antes da publicação de cursos.',
      label_nome_org:'Nome da organização', label_registro:'CNPJ / NIF / Registro', label_area:'Área de atuação',
      label_email_contato:'E-mail de contato', label_telefone_org:'Telefone', label_site:'Site (opcional)',
      label_desc_org:'Descrição da organização', desc_org_placeholder:'Conte um pouco sobre a organização e seu trabalho',
      label_logo:'Logo', upload_logo_hint:'Envie o logo da organização',
      termos_org:'Confirmo que tenho autorização para cadastrar esta organização e aceito os Termos para Parceiros.', btn_enviar_analise:'Enviar para análise'
    },
    es: {
      nav_inicio:'Inicio', nav_servicos:'Servicios', nav_cursos:'Cursos', nav_organizacoes:'Organizaciones', nav_sobre:'Sobre nosotros',
      nav_agenda:'Agenda', nav_perfil:'Mi perfil', nav_notificacoes:'Notificaciones',
      btn_entrar:'Iniciar sesión', btn_cadastrar:'Registrarse', btn_sair:'Salir',
      footer_desc:'Plataforma de oportunidades y apoyo.', footer_links:'Privacidad · Términos · Ayuda',

      hero_eyebrow:'Una red para conectar personas y oportunidades',
      hero_title:'Encuentra apoyo, estudios y nuevas oportunidades.',
      hero_desc:'Una plataforma central para personas, empresas y organizaciones. Agenda citas y visitas, descubre cursos y mantén tu perfil siempre actualizado.',
      hero_cta1:'Crear mi registro', hero_cta2:'Ver cursos',
      hero_card_title:'Próxima cita', hero_card_sub:'Orientación profesional', hero_card_time:'Hoy · 15:30 · Atención presencial', hero_card_btn:'Ver agenda',
      hero_profile_label:'Mi perfil', hero_profile_sub:'Registro completo · 92%',

      servicos_title:'Una plataforma para facilitar el acceso', servicos_sub:'Todo organizado en un solo lugar.',
      feat_agendar_title:'Agendar estudios', feat_agendar_desc:'Elige un curso, horario y formato de estudio de manera simple.',
      feat_visitas_title:'Programar visitas', feat_visitas_desc:'Solicita y da seguimiento a visitas y citas con información clara.',
      feat_org_title:'Organizaciones', feat_org_desc:'Empresas y entidades pueden crear un perfil y publicar oportunidades.',

      cursos_title:'Cursos y oportunidades', cursos_sub:'Ejemplo de cómo aparecerán las oportunidades.', ver_todos:'Ver todos →',
      tag_gratuito:'Gratuito', btn_detalhes:'Detalles',
      curso_informatica_nome:'Informática Básica', curso_informatica_desc:'Curso introductorio para desarrollar competencias digitales.',
      curso_trabalho_nome:'Preparación para el Trabajo', curso_trabalho_desc:'Orientaciones prácticas para currículum y entrevistas.',
      curso_espanhol_nome:'Español para Principiantes', curso_espanhol_desc:'Primeros pasos para la comunicación diaria.',
      curso_informatica_avancada_nome:'Informática Avanzada', curso_informatica_avancada_desc:'Hojas de cálculo, presentaciones y herramientas de productividad.',
      curso_empreendedorismo_nome:'Introducción al Emprendimiento', curso_empreendedorismo_desc:'Primeros pasos para abrir un pequeño negocio.',
      curso_frances_nome:'Francés para Principiantes', curso_frances_desc:'Comunicación básica para el día a día y el trabajo.',

      cta_title:'Tu organización también puede participar', cta_desc:'Registra tu empresa u organización y ofrece cursos, formaciones y oportunidades a la comunidad.', cta_btn:'Registrar organización',

      sobre_title:'Perfil del participante', sobre_sub:'Al registrarse, la persona tendrá un perfil estandarizado y fácil de actualizar.',
      feat_foto_title:'Foto de perfil', feat_foto_desc:'Carga con un estándar visual único para mantener la plataforma organizada.',
      feat_dados_title:'Datos esenciales', feat_dados_desc:'Nombre, teléfono, fecha de nacimiento y otra información necesaria.',
      feat_multilang_title:'Multilingüe', feat_multilang_desc:'Portugués, español, inglés, francés y árabe, con interfaz preparada para expansión.',

      login_eyebrow:'Bienvenido de nuevo', login_title:'Iniciar sesión en la plataforma', login_sub:'Accede a tu perfil, cursos y agenda.',
      label_nome_proto:'Nombre (para el prototipo)', label_email_ou_tel:'Correo o teléfono', label_senha:'Contraseña',
      remember_me:'Recordarme', forgot_pass:'Olvidé mi contraseña', or_divider:'o', btn_org_login:'Entrar como organización',
      no_account:'¿Aún no tienes cuenta?', criar_conta:'Crear cuenta', ja_tem_cadastro:'¿Ya tienes cuenta?',

      cadastro_eyebrow:'Registro de participante', cadastro_title:'Vamos a crear tu perfil', cadastro_sub:'Esta información ayuda a personalizar cursos, agenda y citas.',
      label_foto:'Foto de perfil', upload_hint:'Sube una foto según el estándar visual de la plataforma',
      label_nome_completo:'Nombre completo', label_nascimento:'Fecha de nacimiento', label_telefone:'Teléfono / WhatsApp', label_email:'Correo electrónico',
      label_pais:'País de origen', label_idioma:'Idioma preferido', label_cidade:'Ciudad actual', label_sobre:'Sobre ti',
      sobre_placeholder:'Cuéntanos un poco sobre ti, tus intereses y objetivos',
      termos_consent:'He leído y acepto los Términos de Uso y la Política de Privacidad, y consiento el tratamiento de mis datos conforme al RGPD y a la LOPDGDD (Ley Orgánica de Protección de Datos de España).',
      btn_cancelar:'Cancelar', btn_continuar:'Continuar',

      catalogo_eyebrow:'Catálogo', catalogo_sub:'Encuentra un curso gratuito para desarrollar nuevas competencias.',
      busca_placeholder:'Buscar por curso, área o palabra clave',
      filtro_todos:'Todos', filtro_profissionalizante:'Profesionalizante', filtro_empregabilidade:'Empleabilidad', filtro_idiomas:'Idiomas', filtro_presencial:'Presencial', filtro_online:'En línea',

      info_formato:'Formato', info_duracao:'Duración', info_carga:'Carga horaria', info_vagas:'Vacantes', info_inicio:'Inicio',
      btn_inscrever:'Inscribirse', btn_inscrito:'Inscrito ✓', btn_ver_agenda:'Ver en la agenda',
      sobre_curso:'Sobre el curso', vai_aprender:'Qué vas a aprender',

      agenda_eyebrow:'Mis citas', agenda_title:'Agenda de estudios y visitas', agenda_sub:'Consulta tus horarios o programa una nueva cita.',
      agenda_hint:'Selecciona un día para ver los horarios disponibles.', agenda_novo:'Programar nueva cita',
      label_tipo:'Tipo', label_horario:'Horario preferido', btn_confirmar_agendamento:'Confirmar cita', meus_horarios:'Mis horarios',
      guest_banner_agenda:'Inicia sesión para confirmar citas con tu nombre.',

      guest_banner_perfil:'Estás viendo un perfil de ejemplo. Inicia sesión para ver el tuyo.',
      btn_editar_perfil:'Editar perfil', stat_cursos:'Cursos inscritos', stat_agenda:'Citas programadas', stat_completo:'Registro completo', stat_certificados:'Certificados',
      meus_cursos:'Mis cursos', ver_todos_cursos:'Ver todos los cursos', proximos_atendimentos:'Próximas citas', ver_agenda_completa:'Ver agenda completa',
      dados_pessoais:'Datos personales', d_telefone:'Teléfono', d_email:'Correo electrónico', d_nascimento:'Fecha de nacimiento', d_idioma:'Idioma preferido',

      notif_eyebrow:'Centro de avisos', notif_title:'Notificaciones', notif_sub:'Cursos, citas y novedades de la plataforma.',
      btn_marcar_lidas:'Marcar todas como leídas', notif_empty:'No hay notificaciones por el momento.',

      org_eyebrow:'Para empresas y entidades', org_title:'Tu organización también puede participar.',
      org_desc:'Registra tu empresa, ONG o entidad asociada, publica cursos y oportunidades, y da seguimiento a los participantes en un solo lugar.',
      org_panel_title:'Panel de la organización', org_panel_name:'Apoia+ Formación Profesional', org_panel_stats:'4 cursos activos · 128 inscritos',
      org_verified:'Perfil verificado', org_verified_sub:'Documentación completa',
      org_feat1_title:'Publica cursos', org_feat1_desc:'Anuncia cursos, formaciones y oportunidades para la comunidad atendida.',
      org_feat2_title:'Gestiona inscritos', org_feat2_desc:'Da seguimiento a quién se inscribió y al progreso de cada participante.',
      org_feat3_title:'Informes simples', org_feat3_desc:'Observa el impacto de tu organización con datos claros y actualizados.',
      org_form_eyebrow:'Registro de organización', org_form_title:'Registra tu organización', org_form_sub:'Nuestro equipo revisa y verifica el registro antes de publicar cursos.',
      label_nome_org:'Nombre de la organización', label_registro:'NIF / Registro', label_area:'Área de actividad',
      label_email_contato:'Correo de contacto', label_telefone_org:'Teléfono', label_site:'Sitio web (opcional)',
      label_desc_org:'Descripción de la organización', desc_org_placeholder:'Cuéntanos un poco sobre la organización y su trabajo',
      label_logo:'Logo', upload_logo_hint:'Sube el logo de la organización',
      termos_org:'Confirmo que tengo autorización para registrar esta organización y acepto los Términos para Socios.', btn_enviar_analise:'Enviar para revisión'
    },
    en: {
      nav_inicio:'Home', nav_servicos:'Services', nav_cursos:'Courses', nav_organizacoes:'Organizations', nav_sobre:'About',
      nav_agenda:'Schedule', nav_perfil:'My profile', nav_notificacoes:'Notifications',
      btn_entrar:'Log in', btn_cadastrar:'Sign up', btn_sair:'Log out',
      footer_desc:'A platform for opportunities and support.', footer_links:'Privacy · Terms · Help',

      hero_eyebrow:'A network connecting people and opportunities',
      hero_title:'Find support, learning and new opportunities.',
      hero_desc:'A central platform for people, companies and organizations. Book appointments and visits, discover courses and keep your profile always up to date.',
      hero_cta1:'Create my account', hero_cta2:'View courses',
      hero_card_title:'Next appointment', hero_card_sub:'Career guidance', hero_card_time:'Today · 3:30 PM · In person', hero_card_btn:'View schedule',
      hero_profile_label:'My profile', hero_profile_sub:'Profile complete · 92%',

      servicos_title:'A platform that makes access easier', servicos_sub:'Everything organized in one place.',
      feat_agendar_title:'Schedule studies', feat_agendar_desc:'Choose a course, time and study format easily.',
      feat_visitas_title:'Book visits', feat_visitas_desc:'Request and track visits and appointments with clear information.',
      feat_org_title:'Organizations', feat_org_desc:'Companies and entities can create a profile and publish opportunities.',

      cursos_title:'Courses and opportunities', cursos_sub:'An example of how opportunities will appear.', ver_todos:'View all →',
      tag_gratuito:'Free', btn_detalhes:'Details',
      curso_informatica_nome:'Basic Computer Skills', curso_informatica_desc:'Introductory course to build essential digital skills.',
      curso_trabalho_nome:'Job Readiness', curso_trabalho_desc:'Practical guidance on résumés and interviews.',
      curso_espanhol_nome:'Spanish for Beginners', curso_espanhol_desc:'First steps for everyday communication.',
      curso_informatica_avancada_nome:'Advanced Computer Skills', curso_informatica_avancada_desc:'Spreadsheets, presentations and productivity tools.',
      curso_empreendedorismo_nome:'Introduction to Entrepreneurship', curso_empreendedorismo_desc:'First steps to start a small business.',
      curso_frances_nome:'French for Beginners', curso_frances_desc:'Basic communication for daily life and work.',

      cta_title:'Your organization can join too', cta_desc:'Register your company or organization and offer courses, training and opportunities to the community.', cta_btn:'Register organization',

      sobre_title:'Participant profile', sobre_sub:'When registering, each person gets a standardized profile that is easy to update.',
      feat_foto_title:'Profile photo', feat_foto_desc:'Upload with a unique visual standard to keep the platform organized.',
      feat_dados_title:'Essential data', feat_dados_desc:'Name, phone, date of birth and other required information.',
      feat_multilang_title:'Multilingual', feat_multilang_desc:'Portuguese, Spanish, English, French and Arabic, with an interface ready for expansion.',

      login_eyebrow:'Welcome back', login_title:'Log in to the platform', login_sub:'Access your profile, courses and schedule.',
      label_nome_proto:'Name (for the prototype)', label_email_ou_tel:'Email or phone', label_senha:'Password',
      remember_me:'Remember me', forgot_pass:'Forgot my password', or_divider:'or', btn_org_login:'Log in as an organization',
      no_account:"Don't have an account yet?", criar_conta:'Create account', ja_tem_cadastro:'Already have an account?',

      cadastro_eyebrow:'Participant sign-up', cadastro_title:"Let's create your profile", cadastro_sub:'This information helps personalize courses, schedule and appointments.',
      label_foto:'Profile photo', upload_hint:'Upload a photo following the platform visual standard',
      label_nome_completo:'Full name', label_nascimento:'Date of birth', label_telefone:'Phone / WhatsApp', label_email:'Email',
      label_pais:'Country of origin', label_idioma:'Preferred language', label_cidade:'Current city', label_sobre:'About you',
      sobre_placeholder:'Tell us a bit about yourself, your interests and goals',
      termos_consent:"I have read and accept the Terms of Use and Privacy Policy, and consent to the processing of my data under the GDPR and Spain's LOPDGDD.",
      btn_cancelar:'Cancel', btn_continuar:'Continue',

      catalogo_eyebrow:'Catalog', catalogo_sub:'Find a free course to build new skills.',
      busca_placeholder:'Search by course, area or keyword',
      filtro_todos:'All', filtro_profissionalizante:'Vocational', filtro_empregabilidade:'Employability', filtro_idiomas:'Languages', filtro_presencial:'In person', filtro_online:'Online',

      info_formato:'Format', info_duracao:'Duration', info_carga:'Weekly hours', info_vagas:'Spots', info_inicio:'Start date',
      btn_inscrever:'Enroll', btn_inscrito:'Enrolled ✓', btn_ver_agenda:'View in schedule',
      sobre_curso:'About the course', vai_aprender:"What you'll learn",

      agenda_eyebrow:'My appointments', agenda_title:'Study and visit schedule', agenda_sub:'Track your times or book a new appointment.',
      agenda_hint:'Select a day to see available times.', agenda_novo:'Book a new appointment',
      label_tipo:'Type', label_horario:'Preferred time', btn_confirmar_agendamento:'Confirm appointment', meus_horarios:'My time slots',
      guest_banner_agenda:'Log in to confirm appointments under your name.',

      guest_banner_perfil:"You're viewing a sample profile. Log in to see your own.",
      btn_editar_perfil:'Edit profile', stat_cursos:'Enrolled courses', stat_agenda:'Scheduled appointments', stat_completo:'Profile complete', stat_certificados:'Certificates',
      meus_cursos:'My courses', ver_todos_cursos:'View all courses', proximos_atendimentos:'Upcoming appointments', ver_agenda_completa:'View full schedule',
      dados_pessoais:'Personal data', d_telefone:'Phone', d_email:'Email', d_nascimento:'Date of birth', d_idioma:'Preferred language',

      notif_eyebrow:'Notification center', notif_title:'Notifications', notif_sub:'Courses, appointments and platform news.',
      btn_marcar_lidas:'Mark all as read', notif_empty:'No notifications yet.',

      org_eyebrow:'For companies and organizations', org_title:'Your organization can join too.',
      org_desc:'Register your company, NGO or partner entity, publish courses and opportunities, and track participants in one place.',
      org_panel_title:'Organization dashboard', org_panel_name:'Apoia+ Vocational Training', org_panel_stats:'4 active courses · 128 enrolled',
      org_verified:'Verified profile', org_verified_sub:'Documentation complete',
      org_feat1_title:'Publish courses', org_feat1_desc:'Advertise courses, training and opportunities to the community you serve.',
      org_feat2_title:'Manage enrollees', org_feat2_desc:'Track who enrolled and each participant\'s progress.',
      org_feat3_title:'Simple reports', org_feat3_desc:"See your organization's impact with clear, up-to-date data.",
      org_form_eyebrow:'Organization sign-up', org_form_title:'Register your organization', org_form_sub:'Our team reviews and verifies the registration before courses are published.',
      label_nome_org:'Organization name', label_registro:'Tax ID / Registration number', label_area:'Area of work',
      label_email_contato:'Contact email', label_telefone_org:'Phone', label_site:'Website (optional)',
      label_desc_org:'Organization description', desc_org_placeholder:'Tell us a bit about the organization and its work',
      label_logo:'Logo', upload_logo_hint:"Upload the organization's logo",
      termos_org:'I confirm I am authorized to register this organization and accept the Partner Terms.', btn_enviar_analise:'Submit for review'
    },
    fr: {
      nav_inicio:'Accueil', nav_servicos:'Services', nav_cursos:'Cours', nav_organizacoes:'Organisations', nav_sobre:'À propos',
      nav_agenda:'Agenda', nav_perfil:'Mon profil', nav_notificacoes:'Notifications',
      btn_entrar:'Se connecter', btn_cadastrar:"S'inscrire", btn_sair:'Se déconnecter',
      footer_desc:"Plateforme d'opportunités et de soutien.", footer_links:'Confidentialité · Conditions · Aide',

      hero_eyebrow:'Un réseau pour connecter les personnes et les opportunités',
      hero_title:'Trouvez du soutien, des formations et de nouvelles opportunités.',
      hero_desc:'Une plateforme centrale pour les personnes, les entreprises et les organisations. Planifiez rendez-vous et visites, découvrez des cours et gardez votre profil à jour.',
      hero_cta1:'Créer mon compte', hero_cta2:'Voir les cours',
      hero_card_title:'Prochain rendez-vous', hero_card_sub:'Orientation professionnelle', hero_card_time:"Aujourd'hui · 15h30 · En personne", hero_card_btn:"Voir l'agenda",
      hero_profile_label:'Mon profil', hero_profile_sub:'Profil complet · 92%',

      servicos_title:"Une plateforme qui facilite l'accès", servicos_sub:'Tout organisé en un seul endroit.',
      feat_agendar_title:'Planifier des études', feat_agendar_desc:'Choisissez un cours, un horaire et un format simplement.',
      feat_visitas_title:'Planifier des visites', feat_visitas_desc:'Demandez et suivez visites et rendez-vous avec des informations claires.',
      feat_org_title:'Organisations', feat_org_desc:'Les entreprises et entités peuvent créer un profil et publier des opportunités.',

      cursos_title:'Cours et opportunités', cursos_sub:'Un exemple de la façon dont les opportunités apparaîtront.', ver_todos:'Voir tout →',
      tag_gratuito:'Gratuit', btn_detalhes:'Détails',
      curso_informatica_nome:'Informatique de base', curso_informatica_desc:'Cours d\'introduction pour développer des compétences numériques essentielles.',
      curso_trabalho_nome:"Préparation à l'emploi", curso_trabalho_desc:"Conseils pratiques pour le CV et les entretiens.",
      curso_espanhol_nome:'Espagnol pour débutants', curso_espanhol_desc:'Premiers pas pour communiquer au quotidien.',
      curso_informatica_avancada_nome:'Informatique avancée', curso_informatica_avancada_desc:'Tableurs, présentations et outils de productivité.',
      curso_empreendedorismo_nome:"Introduction à l'entrepreneuriat", curso_empreendedorismo_desc:'Premiers pas pour créer une petite entreprise.',
      curso_frances_nome:'Français pour débutants', curso_frances_desc:'Communication de base pour le quotidien et le travail.',

      cta_title:'Votre organisation peut aussi participer', cta_desc:'Inscrivez votre entreprise ou organisation et proposez cours, formations et opportunités à la communauté.', cta_btn:"Inscrire l'organisation",

      sobre_title:'Profil du participant', sobre_sub:"Lors de l'inscription, chaque personne obtient un profil standardisé et facile à mettre à jour.",
      feat_foto_title:'Photo de profil', feat_foto_desc:'Téléchargement selon un standard visuel unique pour garder la plateforme organisée.',
      feat_dados_title:'Données essentielles', feat_dados_desc:'Nom, téléphone, date de naissance et autres informations nécessaires.',
      feat_multilang_title:'Multilingue', feat_multilang_desc:"Portugais, espagnol, anglais, français et arabe, avec une interface prête pour l'expansion.",

      login_eyebrow:'Content de vous revoir', login_title:'Se connecter à la plateforme', login_sub:'Accédez à votre profil, vos cours et votre agenda.',
      label_nome_proto:'Nom (pour le prototype)', label_email_ou_tel:'E-mail ou téléphone', label_senha:'Mot de passe',
      remember_me:'Se souvenir de moi', forgot_pass:'Mot de passe oublié', or_divider:'ou', btn_org_login:"Se connecter en tant qu'organisation",
      no_account:"Vous n'avez pas encore de compte ?", criar_conta:'Créer un compte', ja_tem_cadastro:'Vous avez déjà un compte ?',

      cadastro_eyebrow:'Inscription du participant', cadastro_title:'Créons votre profil', cadastro_sub:'Ces informations aident à personnaliser cours, agenda et rendez-vous.',
      label_foto:'Photo de profil', upload_hint:'Téléchargez une photo selon le standard visuel de la plateforme',
      label_nome_completo:'Nom complet', label_nascimento:'Date de naissance', label_telefone:'Téléphone / WhatsApp', label_email:'E-mail',
      label_pais:"Pays d'origine", label_idioma:'Langue préférée', label_cidade:'Ville actuelle', label_sobre:'À propos de vous',
      sobre_placeholder:'Parlez-nous un peu de vous, de vos intérêts et de vos objectifs',
      termos_consent:"J'ai lu et j'accepte les Conditions d'utilisation et la Politique de confidentialité, et je consens au traitement de mes données conformément au RGPD et à la LOPDGDD (loi espagnole sur la protection des données).",
      btn_cancelar:'Annuler', btn_continuar:'Continuer',

      catalogo_eyebrow:'Catalogue', catalogo_sub:'Trouvez un cours gratuit pour développer de nouvelles compétences.',
      busca_placeholder:'Rechercher par cours, domaine ou mot-clé',
      filtro_todos:'Tous', filtro_profissionalizante:'Professionnalisant', filtro_empregabilidade:'Employabilité', filtro_idiomas:'Langues', filtro_presencial:'En personne', filtro_online:'En ligne',

      info_formato:'Format', info_duracao:'Durée', info_carga:'Volume horaire', info_vagas:'Places', info_inicio:'Début',
      btn_inscrever:"S'inscrire", btn_inscrito:'Inscrit ✓', btn_ver_agenda:"Voir dans l'agenda",
      sobre_curso:'À propos du cours', vai_aprender:'Ce que vous allez apprendre',

      agenda_eyebrow:'Mes rendez-vous', agenda_title:"Agenda d'études et de visites", agenda_sub:'Suivez vos horaires ou prenez un nouveau rendez-vous.',
      agenda_hint:'Sélectionnez un jour pour voir les horaires disponibles.', agenda_novo:'Prendre un nouveau rendez-vous',
      label_tipo:'Type', label_horario:'Horaire préféré', btn_confirmar_agendamento:'Confirmer le rendez-vous', meus_horarios:'Mes horaires',
      guest_banner_agenda:'Connectez-vous pour confirmer des rendez-vous à votre nom.',

      guest_banner_perfil:"Vous consultez un profil d'exemple. Connectez-vous pour voir le vôtre.",
      btn_editar_perfil:'Modifier le profil', stat_cursos:'Cours inscrits', stat_agenda:'Rendez-vous planifiés', stat_completo:'Profil complet', stat_certificados:'Certificats',
      meus_cursos:'Mes cours', ver_todos_cursos:'Voir tous les cours', proximos_atendimentos:'Prochains rendez-vous', ver_agenda_completa:"Voir l'agenda complet",
      dados_pessoais:'Données personnelles', d_telefone:'Téléphone', d_email:'E-mail', d_nascimento:'Date de naissance', d_idioma:'Langue préférée',

      notif_eyebrow:'Centre de notifications', notif_title:'Notifications', notif_sub:'Cours, rendez-vous et actualités de la plateforme.',
      btn_marcar_lidas:'Tout marquer comme lu', notif_empty:'Aucune notification pour le moment.',

      org_eyebrow:'Pour les entreprises et organisations', org_title:'Votre organisation peut aussi participer.',
      org_desc:'Inscrivez votre entreprise, ONG ou entité partenaire, publiez cours et opportunités, et suivez les participants en un seul endroit.',
      org_panel_title:"Tableau de bord de l'organisation", org_panel_name:'Apoia+ Formation Professionnelle', org_panel_stats:'4 cours actifs · 128 inscrits',
      org_verified:'Profil vérifié', org_verified_sub:'Documentation complète',
      org_feat1_title:'Publier des cours', org_feat1_desc:'Annoncez cours, formations et opportunités à la communauté servie.',
      org_feat2_title:'Gérer les inscrits', org_feat2_desc:'Suivez qui s\'est inscrit et la progression de chaque participant.',
      org_feat3_title:'Rapports simples', org_feat3_desc:"Visualisez l'impact de votre organisation avec des données claires et à jour.",
      org_form_eyebrow:"Inscription de l'organisation", org_form_title:'Inscrivez votre organisation', org_form_sub:"Notre équipe examine et vérifie l'inscription avant la publication des cours.",
      label_nome_org:"Nom de l'organisation", label_registro:"Numéro d'enregistrement", label_area:"Domaine d'activité",
      label_email_contato:'E-mail de contact', label_telefone_org:'Téléphone', label_site:'Site web (facultatif)',
      label_desc_org:"Description de l'organisation", desc_org_placeholder:"Parlez-nous un peu de l'organisation et de son travail",
      label_logo:'Logo', upload_logo_hint:"Téléchargez le logo de l'organisation",
      termos_org:"Je confirme être autorisé(e) à inscrire cette organisation et j'accepte les Conditions Partenaires.", btn_enviar_analise:'Envoyer pour examen'
    },
    ar: {
      nav_inicio:'الرئيسية', nav_servicos:'الخدمات', nav_cursos:'الدورات', nav_organizacoes:'المنظمات', nav_sobre:'حول',
      nav_agenda:'الجدول', nav_perfil:'ملفي الشخصي', nav_notificacoes:'الإشعارات',
      btn_entrar:'تسجيل الدخول', btn_cadastrar:'إنشاء حساب', btn_sair:'تسجيل الخروج',
      footer_desc:'منصة للفرص والدعم.', footer_links:'الخصوصية · الشروط · المساعدة',

      hero_eyebrow:'شبكة لربط الأشخاص بالفرص',
      hero_title:'اعثر على الدعم والدراسة وفرص جديدة.',
      hero_desc:'منصة مركزية للأشخاص والشركات والمنظمات. احجز المواعيد والزيارات، واكتشف الدورات، وحافظ على تحديث ملفك الشخصي دائمًا.',
      hero_cta1:'إنشاء حسابي', hero_cta2:'عرض الدورات',
      hero_card_title:'الموعد القادم', hero_card_sub:'التوجيه المهني', hero_card_time:'اليوم · 15:30 · حضوري', hero_card_btn:'عرض الجدول',
      hero_profile_label:'ملفي الشخصي', hero_profile_sub:'الملف مكتمل · 92%',

      servicos_title:'منصة تسهّل الوصول إلى الخدمات', servicos_sub:'كل شيء منظم في مكان واحد.',
      feat_agendar_title:'جدولة الدراسة', feat_agendar_desc:'اختر دورة ووقتًا وطريقة دراسة بسهولة.',
      feat_visitas_title:'حجز الزيارات', feat_visitas_desc:'اطلب وتابع الزيارات والمواعيد بمعلومات واضحة.',
      feat_org_title:'المنظمات', feat_org_desc:'يمكن للشركات والهيئات إنشاء ملف تعريفي ونشر الفرص.',

      cursos_title:'الدورات والفرص', cursos_sub:'مثال على كيفية ظهور الفرص.', ver_todos:'عرض الكل ←',
      tag_gratuito:'مجاني', btn_detalhes:'التفاصيل',
      curso_informatica_nome:'أساسيات الحاسوب', curso_informatica_desc:'دورة تمهيدية لتطوير المهارات الرقمية الأساسية.',
      curso_trabalho_nome:'الإعداد لسوق العمل', curso_trabalho_desc:'إرشادات عملية لكتابة السيرة الذاتية والمقابلات.',
      curso_espanhol_nome:'الإسبانية للمبتدئين', curso_espanhol_desc:'الخطوات الأولى للتواصل اليومي.',
      curso_informatica_avancada_nome:'الحاسوب المتقدم', curso_informatica_avancada_desc:'جداول البيانات والعروض التقديمية وأدوات الإنتاجية.',
      curso_empreendedorismo_nome:'مقدمة في ريادة الأعمال', curso_empreendedorismo_desc:'الخطوات الأولى لبدء مشروع صغير.',
      curso_frances_nome:'الفرنسية للمبتدئين', curso_frances_desc:'التواصل الأساسي للحياة اليومية والعمل.',

      cta_title:'يمكن لمنظمتك المشاركة أيضًا', cta_desc:'سجّل شركتك أو منظمتك وقدّم الدورات والتدريبات والفرص للمجتمع.', cta_btn:'تسجيل المنظمة',

      sobre_title:'الملف الشخصي للمشارك', sobre_sub:'عند التسجيل، سيحصل الشخص على ملف موحد وسهل التحديث.',
      feat_foto_title:'صورة الملف الشخصي', feat_foto_desc:'رفع الصورة وفق معيار بصري موحد للحفاظ على تنظيم المنصة.',
      feat_dados_title:'البيانات الأساسية', feat_dados_desc:'الاسم والهاتف وتاريخ الميلاد ومعلومات ضرورية أخرى.',
      feat_multilang_title:'متعدد اللغات', feat_multilang_desc:'البرتغالية والإسبانية والإنجليزية والفرنسية والعربية، بواجهة جاهزة للتوسع.',

      login_eyebrow:'مرحبًا بعودتك', login_title:'تسجيل الدخول إلى المنصة', login_sub:'ادخل إلى ملفك الشخصي ودوراتك وجدولك.',
      label_nome_proto:'الاسم (للنموذج الأولي)', label_email_ou_tel:'البريد الإلكتروني أو الهاتف', label_senha:'كلمة المرور',
      remember_me:'تذكرني', forgot_pass:'نسيت كلمة المرور', or_divider:'أو', btn_org_login:'الدخول كمنظمة',
      no_account:'ليس لديك حساب بعد؟', criar_conta:'إنشاء حساب', ja_tem_cadastro:'لديك حساب بالفعل؟',

      cadastro_eyebrow:'تسجيل المشارك', cadastro_title:'لنُنشئ ملفك الشخصي', cadastro_sub:'تساعد هذه المعلومات في تخصيص الدورات والجدول والمواعيد.',
      label_foto:'صورة الملف الشخصي', upload_hint:'ارفع صورة وفق المعيار البصري للمنصة',
      label_nome_completo:'الاسم الكامل', label_nascimento:'تاريخ الميلاد', label_telefone:'الهاتف / واتساب', label_email:'البريد الإلكتروني',
      label_pais:'بلد المنشأ', label_idioma:'اللغة المفضلة', label_cidade:'المدينة الحالية', label_sobre:'نبذة عنك',
      sobre_placeholder:'أخبرنا قليلاً عن نفسك واهتماماتك وأهدافك',
      termos_consent:'لقد قرأت ووافقت على شروط الاستخدام وسياسة الخصوصية، وأوافق على معالجة بياناتي وفقًا للائحة العامة لحماية البيانات (RGPD) وقانون LOPDGDD الإسباني.',
      btn_cancelar:'إلغاء', btn_continuar:'متابعة',

      catalogo_eyebrow:'الكتالوج', catalogo_sub:'ابحث عن دورة مجانية لتطوير مهارات جديدة.',
      busca_placeholder:'ابحث حسب الدورة أو المجال أو الكلمة المفتاحية',
      filtro_todos:'الكل', filtro_profissionalizante:'مهني', filtro_empregabilidade:'قابلية التوظيف', filtro_idiomas:'اللغات', filtro_presencial:'حضوري', filtro_online:'عبر الإنترنت',

      info_formato:'الصيغة', info_duracao:'المدة', info_carga:'عدد الساعات', info_vagas:'المقاعد', info_inicio:'تاريخ البدء',
      btn_inscrever:'التسجيل', btn_inscrito:'مسجَّل ✓', btn_ver_agenda:'عرض في الجدول',
      sobre_curso:'عن الدورة', vai_aprender:'ماذا ستتعلم',

      agenda_eyebrow:'مواعيدي', agenda_title:'جدول الدراسة والزيارات', agenda_sub:'تابع مواعيدك أو احجز موعدًا جديدًا.',
      agenda_hint:'اختر يومًا لعرض الأوقات المتاحة.', agenda_novo:'حجز موعد جديد',
      label_tipo:'النوع', label_horario:'الوقت المفضل', btn_confirmar_agendamento:'تأكيد الموعد', meus_horarios:'مواعيدي',
      guest_banner_agenda:'سجّل الدخول لتأكيد المواعيد باسمك.',

      guest_banner_perfil:'أنت تشاهد ملفًا شخصيًا تجريبيًا. سجّل الدخول لرؤية ملفك الخاص.',
      btn_editar_perfil:'تعديل الملف الشخصي', stat_cursos:'الدورات المسجَّلة', stat_agenda:'المواعيد المجدولة', stat_completo:'الملف مكتمل', stat_certificados:'الشهادات',
      meus_cursos:'دوراتي', ver_todos_cursos:'عرض كل الدورات', proximos_atendimentos:'المواعيد القادمة', ver_agenda_completa:'عرض الجدول الكامل',
      dados_pessoais:'البيانات الشخصية', d_telefone:'الهاتف', d_email:'البريد الإلكتروني', d_nascimento:'تاريخ الميلاد', d_idioma:'اللغة المفضلة',

      notif_eyebrow:'مركز الإشعارات', notif_title:'الإشعارات', notif_sub:'الدورات والمواعيد وأخبار المنصة.',
      btn_marcar_lidas:'تحديد الكل كمقروء', notif_empty:'لا توجد إشعارات حاليًا.',

      org_eyebrow:'للشركات والمنظمات', org_title:'يمكن لمنظمتك المشاركة أيضًا.',
      org_desc:'سجّل شركتك أو منظمتك غير الربحية أو الجهة الشريكة، وانشر الدورات والفرص، وتابع المشاركين في مكان واحد.',
      org_panel_title:'لوحة تحكم المنظمة', org_panel_name:'كاريتاس للتدريب المهني', org_panel_stats:'4 دورات نشطة · 128 مسجَّلًا',
      org_verified:'ملف موثّق', org_verified_sub:'الوثائق مكتملة',
      org_feat1_title:'نشر الدورات', org_feat1_desc:'أعلن عن الدورات والتدريبات والفرص للمجتمع الذي تخدمه.',
      org_feat2_title:'إدارة المسجَّلين', org_feat2_desc:'تابع من سجّل وتقدّم كل مشارك.',
      org_feat3_title:'تقارير بسيطة', org_feat3_desc:'اطّلع على أثر منظمتك ببيانات واضحة ومحدّثة.',
      org_form_eyebrow:'تسجيل المنظمة', org_form_title:'سجّل منظمتك', org_form_sub:'يراجع فريقنا التسجيل ويتحقق منه قبل نشر الدورات.',
      label_nome_org:'اسم المنظمة', label_registro:'رقم السجل / التسجيل الضريبي', label_area:'مجال العمل',
      label_email_contato:'البريد الإلكتروني للتواصل', label_telefone_org:'الهاتف', label_site:'الموقع الإلكتروني (اختياري)',
      label_desc_org:'وصف المنظمة', desc_org_placeholder:'أخبرنا قليلاً عن المنظمة وعملها',
      label_logo:'الشعار', upload_logo_hint:'ارفع شعار المنظمة',
      termos_org:'أؤكد أنني مخوَّل لتسجيل هذه المنظمة وأوافق على شروط الشركاء.', btn_enviar_analise:'إرسال للمراجعة'
    }
  }
};

document.addEventListener('DOMContentLoaded', () => { CARITAS.initHeader(); CARITAS.applyTranslations(); });
