/* =======================================================================
   ESTADO DE DADOS DO APP
   -----------------------------------------------------------------------
   CONTRACTS, TEACHERS e FIXED_SCHEDULE/SCHEDULE_ROWS começam vazios e são
   preenchidos por reloadAll() (js/db.js) a partir do Supabase. Nenhum dado
   fictício é usado como fonte principal — isso é só o "estado inicial".
   O restante deste arquivo são constantes/labels que não vêm do banco.
   ======================================================================= */

var CONTRACTS = [];
var TEACHERS = [];
/* FIXED_SCHEDULE: { monday: ['07:00','19:00'], ... } — só horários ATIVOS,
   já no formato que a lógica de conflito (helpers.js) espera. */
var FIXED_SCHEDULE = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
/* SCHEDULE_ROWS: linhas cruas da tabela weekly_schedule (com id), usadas
   pela tela "Grade da Bike" para poder editar/remover cada horário. */
var SCHEDULE_ROWS = [];

var APP_BOOTED = false;   // true depois do primeiro carregamento bem-sucedido
var APP_LOAD_ERROR = null;
var currentUserEmail = null; // preenchido em app.js após confirmar a sessão (Supabase Auth)
var currentUserId = null; // uuid do usuário autenticado (auth.uid())
var currentUserDisplayName = null; // preenchido em app.js a partir de user_profiles (com fallback pelo e-mail)

const CLIENT_COLORS = [
  '#E29A5A', '#6FA8DC', '#B18AE0', '#E0708A', '#7FC29A',
  '#E0C468', '#8A9CE0', '#D98F6F', '#6FC2C2', '#C28AE0',
];

const WEEKDAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const WEEKDAY_LABEL = { monday:'Segunda', tuesday:'Terça', wednesday:'Quarta', thursday:'Quinta', friday:'Sexta', saturday:'Sábado', sunday:'Domingo' };
const WEEKDAY_SHORT = { monday:'SEG', tuesday:'TER', wednesday:'QUA', thursday:'QUI', friday:'SEX', saturday:'SÁB', sunday:'DOM' };
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATUS_LABEL = {
  interest: 'Interesse', alignment: 'Alinhamento', quote: 'Orçamento',
  pre_reservation: 'Pré-reserva', confirmed: 'Reserva confirmada',
  completed: 'Realizado', cancelled: 'Cancelado',
};
const STATUS_ORDER = ['interest','alignment','quote','pre_reservation','confirmed','completed','cancelled'];
const PAYMENT_LABEL = { pending: 'Pendente', paid: 'Pago' };
const PAYMENT_METHOD_LABEL = {
  pix_cnpj: 'PIX CNPJ', pix_machine: 'PIX maquininha', credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito', cash: 'Dinheiro',
};
const TEACHER_CHECK_LABEL = { not_contacted: 'Não consultado', waiting: 'Aguardando retorno', available: 'Disponível', unavailable: 'Indisponível' };
const QUOTE_LABEL = { not_sent: 'Não enviado', sent: 'Enviado', approved: 'Aprovado', rejected: 'Recusado' };
const CHANNEL_LABEL = { whatsapp: 'WhatsApp', talkmi: 'TalkMi', email: 'E-mail' };

const ACTIVE_STATUSES = ['interest','alignment','quote','pre_reservation','confirmed'];
const INTEREST_STAGE = ['interest','alignment','quote'];

/* Horários-base da grade (linhas visuais da Agenda e candidatos para a aba
   "Horários disponíveis"). Usado por render-agenda.js e helpers.js. */
const GRID_HOURS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
