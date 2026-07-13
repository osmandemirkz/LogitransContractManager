import { FlatClauseItem } from '@/types/contract';
import { formatContractAmount, formatContractAmountLocale } from '@/lib/numberToWordsRu';

/**
 * Generates flat clause items — each sub-clause is an independent record.
 * Section headers (1, 2, 3 ...) have isHeader=true.
 * Sub-clauses (1.1, 1.2 ...) have isHeader=false.
 */
export function generateFlatClauses(
  currency?: string,
  contractAmount?: string,
): FlatClauseItem[] {
  const cur = currency || 'USD';
  const amt = contractAmount || '';

  const currencyNameRu = cur === 'UZS' ? 'узбекский сум (UZS)'
    : cur === 'KZT' ? 'казахстанский тенге (KZT)'
    : cur === 'RUB' ? 'российский рубль (RUB)'
    : cur === 'EUR' ? 'евро (EUR)'
    : cur === 'TRY' ? 'турецкая лира (TRY)'
    : 'доллар США (USD)';

  const currencyNameEn = cur === 'UZS' ? 'Uzbekistani sum (UZS)'
    : cur === 'KZT' ? 'Kazakhstani tenge (KZT)'
    : cur === 'RUB' ? 'Russian ruble (RUB)'
    : cur === 'EUR' ? 'Euro (EUR)'
    : cur === 'TRY' ? 'Turkish Lira (TRY)'
    : 'US Dollar (USD)';

  const currencyNameTr = cur === 'UZS' ? 'Özbek somu (UZS)'
    : cur === 'KZT' ? 'Kazak tengesi (KZT)'
    : cur === 'RUB' ? 'Rus rublesi (RUB)'
    : cur === 'EUR' ? "Euro'dur (EUR)"
    : cur === 'TRY' ? "Türk Lirası'dır (TRY)"
    : "ABD Doları'dır (USD)";

  const items: Omit<FlatClauseItem, 'sortOrder'>[] = [

    // ─── Section 1 ───────────────────────────────────────────────────────────
    {
      id: 's1',
      itemNumber: '1.',
      contentRu: 'ПРЕДМЕТ ДОГОВОРА',
      contentEn: 'SUBJECT OF THE AGREEMENT',
      contentTr: 'SÖZLEŞMENİN KONUSU',
      isActive: true,
      isHeader: true,
    },
    {
      id: 's1_1',
      itemNumber: '1.1.',
      contentRu: 'По настоящему договору Экспедитор обязуется от своего имени за вознаграждение и за счет Клиента выполнить или организовать выполнение определенных договором экспедиции услуг, связанных с перевозкой груза автомобильным транспортом в международном сообщении, а Клиент обязуется оплатить оказанные услуги.',
      contentEn: 'Under this Agreement, the Forwarder undertakes, in its own name, for remuneration and at the expense of the Client, to perform or arrange for the performance of the freight forwarding services specified in the Agreement, related to the international carriage of goods by road, and the Client undertakes to pay for the services rendered.',
      contentTr: 'İşbu sözleşme uyarınca Taşıyıcı, kendi adına, bir ücret karşılığında ve Müşteri hesabına, sözleşmede belirtilen ve malların karayolu taşıtlarıyla uluslararası taşınmasıyla ilgili lojistik (nakliye organizasyonu) hizmetlerini yerine getirmeyi veya yerine getirilmesini organize etmeyi taahhüt eder; Müşteri ise sunulan hizmetlerin bedelini ödemeyi taahhüt eder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's1_2',
      itemNumber: '1.2.',
      contentRu: 'Отношения сторон регулируются настоящим договором, законодательством страны, где расположен суд, нормами международного права, применимыми к отношениям сторон в силу содержащихся в них указаний.',
      contentEn: 'The relations between the Parties shall be governed by this Agreement, the laws of the country where the court is located, and the norms of international law applicable to the relations of the Parties by virtue of the instructions contained therein.',
      contentTr: 'Taraflar arasındaki ilişkiler; işbu sözleşme, davanın görüldüğü mahkemenin bulunduğu ülkenin mevzuatı ve içerdikleri hükümler gereğince Tarafların ilişkilerine uygulanabilir nitelikteki uluslararası hukuk kuralları ile düzenlenir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's1_3',
      itemNumber: '1.3.',
      contentRu: `В соответствии с положениями настоящего договора Клиент обязуется своевременно оплачивать услуги, предоставленные Экспедитором. Оформление Заявки (форма запроса на услугу) не является обязательным для сторон. Однако Экспедитор вправе направить Заявку, если сочтёт это необходимым, и в таком случае условия и положения, указанные в Заявке, становятся неотъемлемой и обязательной частью настоящего договора.

Окончательная стоимость услуги указывается в счёте-фактуре или иных документах, направленных посредством WhatsApp, Telegram, электронной почты или других электронных каналов связи. Клиент признаёт юридическую силу таких сообщений и безусловно соглашается с тем, что направленные в этих форматах счета и документы являются официальным уведомлением. Стороны также признают, что вся переписка, осуществляемая через данные электронные каналы, имеет юридическую силу официального документа и может быть использована в качестве доказательства в судебных разбирательствах.

После получения счёта Клиент обязан в течение 5 (пяти) календарных дней возвратить его с подписью либо направить письменные возражения, если таковые имеются. В случае отсутствия ответа в указанный срок счёт и указанная в нём сумма считаются безоговорочно принятыми Клиентом.

Стороны дополнительно соглашаются с тем, что стоимость услуг не является фиксированной и может быть изменена Экспедитором в одностороннем порядке при предварительном уведомлении Клиента — в случае возникновения непредвиденных расходов, изменения характеристик груза, тарифной политики или условий перевозки.`,
      contentEn: `In accordance with the provisions of this Agreement, the Client undertakes to pay for the services provided by the Forwarder in a timely manner. The execution of an Order (service request form) is not mandatory for the Parties. However, the Forwarder shall be entitled to issue an Order if it deems it necessary, in which case the terms and conditions specified in the Order shall become an integral and binding part of this Agreement.

The final cost of the service shall be specified in the invoice or other documents transmitted via WhatsApp, Telegram, e-mail, or other electronic communication channels. The Client recognizes the legal validity of such messages and unconditionally agrees that invoices and documents sent in these formats constitute official notification. The Parties also recognize that all correspondence carried out through these electronic channels has the legal force of an official document and may be used as evidence in court proceedings.

Upon receipt of the invoice, the Client shall, within 5 (five) calendar days, return it signed or submit written objections, if any. In the absence of a response within the specified period, the invoice and the amount specified therein shall be deemed unconditionally accepted by the Client.

The Parties further agree that the cost of services is not fixed and may be modified unilaterally by the Forwarder upon prior notice to the Client in the event of unforeseen expenses, changes in cargo characteristics, tariff policy, or transportation conditions.`,
      contentTr: `İşbu sözleşme hükümleri uyarınca Müşteri, Taşıyıcı tarafından sunulan hizmetlerin bedelini zamanında ödemeyi taahhüt eder. Talep Formunun (hizmet talep formu) düzenlenmesi Taraflar için zorunlu değildir. Ancak Taşıyıcı, gerekli görmesi halinde Talep Formu göndermeye yetkilidir ve bu durumda Talep Formunda belirtilen hüküm ve koşullar işbu sözleşmenin ayrılmaz ve bağlayıcı bir parçası haline gelir.

Hizmetin nihai bedeli; WhatsApp, Telegram, e-posta veya diğer elektronik iletişim kanalları vasıtasıyla gönderilen fatura veya diğer belgelerde belirtilir. Müşteri, bu tür mesajların hukuki geçerliliğini tanır ve bu formatlarda gönderilen fatura ve belgelerin resmi bildirim niteliğinde olduğunu kayıtsız şartsız kabul eder. Taraflar ayrıca, söz konusu elektronik kanallar üzerinden yapılan tüm yazışmaların resmi bir belge hükmünde olduğunu ve mahkeme süreçlerinde delil olarak kullanılabileceğini kabul ederler.

Faturanın alınmasını müteakip Müşteri, 5 (beş) takvim günü içinde faturayı imzalayarak iade etmekle veya varsa yazılı itirazlarını iletmekle yükümlüdür. Belirtilen süre içinde yanıt verilmemesi halinde, fatura ve faturada belirtilen tutar Müşteri tarafından kayıtsız şartsız kabul edilmiş sayılır.

Taraflar ayrıca, hizmet bedelinin sabit olmadığını ve öngörülemeyen masrafların ortaya çıkması, yükün özelliklerinin, tarife politikasının veya taşıma koşullarının değişmesi durumunda Müşteriye önceden bildirimde bulunulması şartıyla Taşıyıcı tarafından tek taraflı olarak değiştirilebileceğini kabul ederler.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's1_4',
      itemNumber: '1.4.',
      contentRu: 'Экспедитор может привлечь к исполнению своих обязанностей, указанных в п.1.1 настоящего договора, третьих лиц. Возложение исполнения обязательства на третье лицо не освобождает Экспедитора от ответственности перед Заказчиком за выполнение договора.',
      contentEn: 'The Forwarder may engage third parties to perform its obligations specified in clause 1.1 of this Agreement. Delegation of performance to a third party shall not relieve the Forwarder of liability to the Client for the performance of the Agreement.',
      contentTr: 'Taşıyıcı, işbu sözleşmenin 1.1. maddesinde belirtilen yükümlülüklerinin ifası için üçüncü kişileri görevlendirebilir. İfanın üçüncü bir kişiye devredilmesi, Taşıyıcıyı sözleşmenin yerine getirilmesi konusunda Müşteriye karşı olan sorumluluğundan kurtarmaz.',
      isActive: true,
      isHeader: false,
    },

    // ─── Section 2 ───────────────────────────────────────────────────────────
    {
      id: 's2',
      itemNumber: '2.',
      contentRu: 'ПРАВА И ОБЯЗАННОСТИ ЭКСПЕДИТОРА',
      contentEn: 'RIGHTS AND OBLIGATIONS OF THE FORWARDER',
      contentTr: 'TAŞIYICININ HAK VE YÜKÜMLÜLÜKLERİ',
      isActive: true,
      isHeader: true,
    },
    {
      id: 's2_1',
      itemNumber: '2.1.',
      contentRu: `Экспедитор обязуется оказать следующие услуги:
• поиск и фрахтование транспортного средства для перевозки грузов по заявкам Клиента;
• осуществление за счет Клиента расчетов с перевозчиками и иными третьими лицами, связанными с выполнением обязанностей Экспедитора по настоящему договору.

Экспедитор выполняет и другие обязанности, если они прямо указаны в приложениях или заявках к настоящему договору.

При отсутствии четко выраженных инструкций, Экспедитор организует выполнение работ и услуг путем подбора наиболее подходящих средств и способов транспортировки; услуги, не оговоренные в Заявке, считаются неоплаченными и не оказываются.`,
      contentEn: `The Forwarder undertakes to provide the following services:
• Search for and chartering of transport vehicles for the carriage of goods according to the Client's Orders;
• Settlement of accounts, at the Client's expense, with carriers and other third parties involved in the performance of the Forwarder's obligations under this Agreement.

The Forwarder shall also perform other duties if they are explicitly stated in the annexes or orders to this Agreement.

In the absence of explicit instructions, the Forwarder shall arrange for the performance of works and services by selecting the most suitable means and methods of transportation; services not specified in the Order shall be deemed unpaid and will not be provided.`,
      contentTr: `Taşıyıcı, aşağıdaki hizmetleri sunmayı taahhüt eder:
• Müşterinin talepleri doğrultusunda malların taşınması için uygun nakliye aracının bulunması ve kiralanması (navlun edilmesi);
• Taşıyıcının işbu sözleşme kapsamındaki yükümlülüklerinin yerine getirilmesiyle ilgili olarak, giderleri Müşteriye ait olmak üzere, nakliyeciler ve diğer üçüncü kişilerle hesaplaşmaların yapılması.

Taşıyıcı, işbu sözleşmenin eklerinde veya taleplerinde açıkça belirtilmesi halinde diğer yükümlülükleri de yerine getirir.

Açık ve net talimatların bulunmaması durumunda Taşıyıcı, en uygun nakliye araç ve yöntemlerini seçerek iş ve hizmetlerin yürütülmesini organize eder; Talep Formunda belirtilmeyen hizmetler bedeli ödenmemiş sayılır ve sunulmaz.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_2',
      itemNumber: '2.2.',
      contentRu: 'При наличии поручения и оплаты на страхование Экспедитор обязуется застраховать груз в течение 2 банковских дней после предоставления Клиентом полной информации, необходимой для заключения договора страхования и осуществления оплаты. Условия страхования определяются Правилами деятельности Страховщика.',
      contentEn: 'Subject to an instruction and payment for insurance, the Forwarder undertakes to insure the cargo within 2 bank business days after the Client provides full information necessary for the conclusion of the insurance contract and effects the payment. The insurance conditions shall be determined by the Rules of Activity of the Insurer.',
      contentTr: 'Sigorta talimatının ve ödemesinin mevcut olması halinde Taşıyıcı, Müşteri tarafından sigorta sözleşmesinin akdedilmesi ve ödemenin yapılması için gerekli olan tüm bilgilerin eksiksiz olarak sunulmasından itibaren 2 banka iş günü içinde yükü sigortalamayı taahhüt eder. Sigorta koşulları, Sigortacının Faaliyet Kuralları tarafından belirlenir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_3',
      itemNumber: '2.3.',
      contentRu: 'Экспедитор в максимально короткий срок письменно подтверждает заявку Клиента на перевозку. Не позднее дня, предшествующего дате загрузки, Экспедитор сообщает Клиенту номера подвижного состава (тягачей и полуприцепов), направляемого под погрузку.',
      contentEn: 'The Forwarder shall confirm the Client\'s transport order in writing within the shortest possible time. No later than the day preceding the loading date, the Forwarder shall inform the Client of the registration numbers of the rolling stock (trucks and semi-trailers) sent for loading.',
      contentTr: 'Taşıyıcı, Müşterinin taşıma talebini en kısa sürede yazılı olarak onaylar. Yükleme tarihinden en geç bir önceki gün Taşıyıcı, yükleme için yönlendirilen araç filosunun (çekici ve yarı römorkların) plaka numaralarını Müşteriye bildirir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_4',
      itemNumber: '2.4.',
      contentRu: 'Экспедитор обеспечивает подачу автомобилей под загрузку в срок и в количестве в соответствии с заявкой Клиента. Подача под погрузку автомобиля с параметрами, не соответствующими заявке Клиента, и/или технически неисправного приравнивается к неподаче автомобиля.',
      contentEn: 'The Forwarder ensures the provision of vehicles for loading within the time limits and in the quantity in accordance with the Client\'s order. The provision of a vehicle for loading with parameters that do not correspond to the Client\'s order and/or is technically defective shall be equated to non-provision of the vehicle.',
      contentTr: 'Taşıyıcı, Müşterinin talebine uygun olarak araçların zamanında ve belirtilen miktarda yüklemeye hazır bulundurulmasını sağlar. Müşterinin talebine uymayan özelliklere sahip ve/veya teknik olarak arızalı bir aracın yüklemeye gönderilmesi, aracın hiç gönderilmemesi ile eşdeğer kabul edilir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_5',
      itemNumber: '2.5.',
      contentRu: `Экспедитор обязуется обеспечить доставку груза в сроки, указанные в заявке либо исходя из ежесуточного пробега в 400 км.

Экспедитор незамедлительно информирует Клиента обо всех случаях вынужденной задержки автомобилей в пути, авариях и других непредвиденных обстоятельствах, препятствующих своевременной доставке груза.`,
      contentEn: `The Forwarder undertakes to ensure the delivery of the cargo within the time limits specified in the order or based on a daily run of 400 km.

The Forwarder shall immediately inform the Client of all cases of forced delay of vehicles en route, accidents, and other unforeseen circumstances preventing the timely delivery of cargo.`,
      contentTr: `Taşıyıcı, yükün talepte belirtilen sürelerde veya günlük 400 km yol katetme esasına göre teslim edilmesini sağlamayı taahhüt eder.

Taşıyıcı; araçların yolda zorunlu olarak gecikmesi, kaza yapması ve yükün zamanında teslim edilmesini engelleyen diğer öngörülemeyen durumlar hakkında Müşteriyi derhal bilgilendirir.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_6',
      itemNumber: '2.6.',
      contentRu: `Экспедитор вправе приостановить исполнение своих обязательств по настоящему договору, если:
• Клиент не выполнил условия оплаты,
• Клиент не выполнил обязанности, установленные пп.3.1–3.3 настоящего договора.`,
      contentEn: `The Forwarder shall be entitled to suspend the performance of its obligations under this Agreement if:
• The Client has failed to comply with the payment terms;
• The Client has failed to perform the obligations established by clauses 3.1–3.3 of this Agreement.`,
      contentTr: `Aşağıdaki durumlarda Taşıyıcı, işbu sözleşme kapsamındaki yükümlülüklerinin ifasını durdurma hakkına sahiptir:
• Müşterinin ödeme koşullarını yerine getirmemesi,
• Müşterinin işbu sözleşmenin 3.1–3.3. maddelerinde belirlenen yükümlülükleri yerine getirmemesi.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_7',
      itemNumber: '2.7.',
      contentRu: 'Экспедитор вправе отступать от указаний Клиента в интересах Клиента.',
      contentEn: 'The Forwarder shall be entitled to deviate from the Client\'s instructions in the interest of the Client.',
      contentTr: 'Taşıyıcı, Müşterinin menfaatine uygun olmak kaydıyla Müşterinin talimatlarından sapma hakkına sahiptir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_8',
      itemNumber: '2.8.',
      contentRu: 'Экспедитор вправе удерживать груз в случае неоплаты Клиентом услуг Экспедитора.',
      contentEn: 'The Forwarder shall be entitled to lien (retain) the cargo in the event of non-payment by the Client for the Forwarder\'s services.',
      contentTr: 'Müşterinin Taşıyıcı hizmetlerinin bedelini ödememesi halinde Taşıyıcı, yükü hapis hakkını kullanarak elinde tutma (alıkoyma) yetkisine sahiptir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_9',
      itemNumber: '2.9.',
      contentRu: 'В случае отсутствия или неправильности упаковки грузов, по своей природе подверженных порче и повреждению без упаковки или при неудовлетворительной их упаковке, Экспедитор за сохранность груза в процессе перевозки ответственности не несет.',
      contentEn: 'In the event of absence or defectiveness of the packaging of goods which by their nature are subject to spoilage and damage without packaging or under unsatisfactory packaging, the Forwarder shall not be liable for the safety of the cargo during transportation.',
      contentTr: 'Yapısı gereği ambalajsız veya yetersiz ambalajla taşındığında bozulmaya ve hasara maruz kalabilecek malların ambalajının bulunmaması veya kusurlu olması durumunda, Taşıyıcı taşıma sürecinde yükün muhafazasından sorumlu tutulamaz.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_10',
      itemNumber: '2.10.',
      contentRu: 'Организовать доставку груза в сохранности с соблюдением международных договоров, правил и конвенций, регулирующих международную перевозку товаров (ИАТА, КДПГ, ДОПОГ и т.д.).',
      contentEn: 'Arrange for the safe delivery of cargo in compliance with international treaties, rules, and conventions regulating the international carriage of goods (IATA, CMR, ADR, etc.).',
      contentTr: 'Yükün, uluslararası mal taşımacılığını düzenleyen uluslararası anlaşma, kural ve sözleşmelere (IATA, CMR, ADR vb.) uygun olarak hasarsız ve emniyetli bir şekilde teslim edilmesini organize etmek.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_11',
      itemNumber: '2.11.',
      contentRu: 'Экспедитор имеет право в случае необходимости начать юридический процесс в местных судах страны и города, где официально зарегистрирован заказчик.',
      contentEn: 'The Forwarder shall have the right, if necessary, to initiate legal proceedings in the local courts of the country and city where the Client is officially registered.',
      contentTr: 'Taşıyıcı, gerekli görmesi halinde Müşterinin resmi olarak kayıtlı olduğu ülke ve şehrin yerel mahkemelerinde yasal süreç başlatma hakkına sahiptir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's2_12',
      itemNumber: '2.12.',
      contentRu: 'По требованию Клиента Исполнитель нанимает брокеров для оказания услуг по таможенному оформлению за счет Клиента.',
      contentEn: 'At the request of the Client, the Forwarder shall hire brokers to provide customs clearance services at the Client\'s expense.',
      contentTr: 'Müşterinin talebi üzerine Taşıyıcı, giderleri Müşteriye ait olmak üzere gümrükleme hizmetleri sunmak için brokerler (gümrük müşavirleri) görevlendirir.',
      isActive: true,
      isHeader: false,
    },

    // ─── Section 3 ───────────────────────────────────────────────────────────
    {
      id: 's3',
      itemNumber: '3.',
      contentRu: 'ПРАВА И ОБЯЗАННОСТИ КЛИЕНТА',
      contentEn: 'RIGHTS AND OBLIGATIONS OF THE CLIENT',
      contentTr: 'MÜŞTERİNİN HAK VE YÜKÜMLÜLÜKLERİ',
      isActive: true,
      isHeader: true,
    },
    {
      id: 's3_1',
      itemNumber: '3.1.',
      contentRu: `На каждую перевозку не позднее, чем за 3 дня до начала перевозки, направить Экспедитору заявку с указанием данных, необходимых для осуществления перевозки:

а) маршрут и условия перевозки;
б) требуемый тип подвижного состава (тип полуприцепа, объем);
в) подробный адрес места загрузки;
г) дата и время подачи автомобилей под погрузку;
д) конкретное лицо, ответственное за погрузку, и его телефон;
е) наименование и характеристика груза;
ж) вес груза (нетто, брутто);
з) вид тары и упаковки;
и) необходимые приспособления для крепления груза;
к) условия работы с таможней, места прохождения через таможенные пункты;
л) точный адрес таможни назначения с указанием названия СВХ и № лицензии;
м) стоимость груза;
н) условия страхования;
о) адрес места разгрузки;
п) нужна ли переадресовка;
р) ответственный за разгрузку и его телефон;
с) дата прибытия автомобиля под разгрузку;
т) сумма оплаты за перевозку.`,
      contentEn: `For each transportation, no later than 3 days prior to the commencement of transportation, to send to the Forwarder an order indicating the data necessary for the execution of transportation:

a) route and conditions of transportation;
b) required type of rolling stock (type of semi-trailer, volume);
c) detailed address of the loading place;
d) date and time of vehicle provision for loading;
e) specific person responsible for loading and their telephone number;
f) name and characteristics of the cargo;
g) weight of the cargo (net, gross);
h) type of container and packaging;
i) necessary devices for securing the cargo;
j) conditions of interaction with customs, places of passage through customs points;
k) exact address of the destination customs with indication of the TSW name and license number;
l) value of the cargo;
m) insurance conditions;
n) address of the unloading place;
o) whether re-routing is required;
p) person responsible for unloading and their telephone number;
q) date of arrival of the vehicle for unloading;
r) payment amount for the transportation.`,
      contentTr: `Her bir taşıma için, taşıma başlamadan en geç 3 gün önce Taşıyıcıya, taşımanın gerçekleştirilmesi için gerekli verileri içeren bir talep göndermek:

a) Taşıma güzergahı ve koşulları;
b) Gerekli araç tipi (yarı römork tipi, hacmi);
c) Yükleme yerinin detaylı adresi;
d) Araçların yükleme için hazır bulundurulacağı tarih ve saat;
e) Yüklemeden sorumlu belirli kişinin adı ve telefon numarası;
f) Yükün adı ve özellikleri;
g) Yükün ağırlığı (net, brüt);
h) Kap ve ambalaj türü;
i) Yükün sabitlenmesi için gerekli araç ve aparatlar;
j) Gümrük ile çalışma koşulları, gümrük noktalarından geçiş yerleri;
k) TSW adı ve lisans numarası belirtilerek varış gümrüğünün tam adresi;
l) Yükün değeri;
m) Sigorta koşulları;
n) Boşaltma yerinin adresi;
o) Adres değişikliği (re-routing) gerekip gerekmediği;
p) Boşaltmadan sorumlu kişi ve telefonu;
q) Aracın boşaltma yerine varış tarihi;
r) Taşıma için ödeme tutarı.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_2',
      itemNumber: '3.2.',
      contentRu: 'Клиент обязуется при подаче автомобиля под загрузку предъявлять к перевозке грузы в соответствии с заявками, подтвержденными Экспедитором.',
      contentEn: 'The Client undertakes, upon provision of the vehicle for loading, to present goods for carriage in accordance with the orders confirmed by the Forwarder.',
      contentTr: 'Müşteri, aracın yüklemeye gelmesi üzerine, Taşıyıcı tarafından onaylanan taleplere uygun malları taşımaya sunmayı taahhüt eder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_3',
      itemNumber: '3.3.',
      contentRu: 'Клиент своими силами и за свой счет обязан обеспечить надлежащую упаковку отправляемого груза, его крепление на автомобилях, а также погрузку и выгрузку. Упаковка, крепление и размещение груза должны обеспечивать его сохранность в процессе перевозки, а также исключать возможность повреждения транспортных средств.',
      contentEn: 'The Client shall, with its own resources and at its own expense, ensure the proper packaging of the shipped cargo, its securing on the vehicles, as well as loading and unloading. The packaging, securing, and placement of the cargo must ensure its safety during transportation and exclude the possibility of damage to transport vehicles.',
      contentTr: 'Müşteri, gönderilen yükün uygun şekilde ambalajlanmasını, araçlara sabitlenmesini, ayrıca yükleme ve boşaltma işlemlerini kendi imkanlarıyla ve masrafları kendisine ait olmak üzere sağlamakla yükümlüdür. Yükün ambalajlanması, sabitlenmesi ve yerleştirilmesi, taşıma sürecinde yükün güvenliğini sağlamalı ve nakliye araçlarının hasar görme olasılığını ortadan kaldırmalıdır.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_4',
      itemNumber: '3.4.',
      contentRu: 'В случае повреждения (загрязнения) транспортных средств в ходе погрузочно-разгрузочных работ Клиент несет материальную ответственность в сумме фактических затрат на их ремонт (очистку, дезинфекцию).',
      contentEn: 'In the event of damage to (or contamination of) transport vehicles during loading and unloading operations, the Client shall bear material liability in the amount of actual expenses for their repair (cleaning, disinfection).',
      contentTr: 'Yükleme ve boşaltma işlemleri sırasında nakliye araçlarının hasar görmesi (veya kirlenmesi) durumunda Müşteri, araçların onarımı (temizliği, dezenfeksiyonu) için yapılan fiili masraflar tutarında maddi sorumluluk taşır.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_5',
      itemNumber: '3.5.',
      contentRu: `Клиент обязан обеспечить следующие нормативные сроки погрузки/выгрузки и таможенного оформления груза:
• в странах Евросоюза — в течение одного рабочего дня;
• в других странах — в течение двух рабочих дней, если товар требует таможенного оформления, и в течение одного рабочего дня, если товар не требует таможенного оформления.

Фактические сроки простоя под погрузкой (выгрузкой) рассчитываются:
• с даты прибытия транспортного средства, если транспортные средства поданы под погрузку (выгрузку) до 12.00 часов рабочего дня;
• со следующего рабочего дня после прибытия, если транспортные средства поданы после 12.00 часов рабочего дня, либо в пятницу, либо в предпраздничный день.`,
      contentEn: `The Client is obliged to ensure the following standard time limits for loading/unloading and customs clearance of cargo:
• In European Union countries — within one working day;
• In other countries — within two working days if the goods require customs clearance, and within one working day if the goods do not require customs clearance.

The actual periods of laytime under loading (unloading) shall be calculated:
• From the date of arrival of the transport vehicle, if the transport vehicles are provided for loading (unloading) before 12:00 hours of a working day;
• From the next working day after arrival, if the transport vehicles are provided after 12:00 hours of a working day, or on Friday, or on a pre-holiday day.`,
      contentTr: `Müşteri, yükün yüklenmesi/boşaltılması ve gümrük işlemleri için aşağıdaki standart süreleri sağlamakla yükümlüdür:
• Avrupa Birliği ülkelerinde — bir iş günü içinde;
• Diğer ülkelerde — malın gümrük işlemine tabi olması durumunda iki iş günü içinde, malın gümrük işlemine tabi olmaması durumunda ise bir iş günü içinde.

Yükleme (boşaltma) altındaki fiili durma süreleri şu şekilde hesaplanır:
• Nakliye araçlarının bir iş günü saat 12.00'den önce yüklemeye (boşaltmaya) gelmesi durumunda aracın varış tarihinden itibaren;
• Nakliye araçlarının bir iş günü saat 12.00'den sonra, Cuma günü veya resmi tatil öncesi günde gelmesi durumunda varışını takip eden ilk iş gününden itibaren.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_6',
      itemNumber: '3.6.',
      contentRu: 'Клиент своими силами и за свой счет производит таможенное оформление груза, а также оформляет транспортные накладные, предоставляет товаросопроводительные и другие документы, необходимые для беспрепятственной перевозки груза и прохождения грузом государственного таможенного, фитосанитарного, иного контроля на всем пути следования, если иное не оговорено в заявке.',
      contentEn: 'The Client shall, by its own efforts and at its own expense, perform customs clearance of the cargo, as well as execute transport waybills, provide shipping and other documents necessary for the unobstructed transportation of cargo and the passage of cargo through state customs, phytosanitary, and other control along the entire route, unless otherwise specified in the order.',
      contentTr: 'Talep formunda aksi belirtilmedikçe Müşteri, yükün gümrük işlemlerini kendi imkanlarıyla ve masrafları kendisine ait olmak üzere gerçekleştirir, ayrıca taşıma irsaliyelerini düzenler, yükün sorunsuz bir şekilde taşınması ve tüm güzergah boyunca devlet gümrük, bitki sağlığı ve diğer kontrollerden geçmesi için gerekli olan sevk ve diğer belgeleri sağlar.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_7',
      itemNumber: '3.7.',
      contentRu: 'Клиент обязан указать особые свойства груза, вследствие которых может быть причинен ущерб самому грузу, третьим лицам, их имуществу, окружающей среде, а также свойства груза, требующего специальных условий транспортировки.',
      contentEn: 'The Client is obliged to specify the special properties of the cargo, as a result of which damage may be caused to the cargo itself, third parties, their property, or the environment, as well as properties of the cargo requiring special transportation conditions.',
      contentTr: 'Müşteri; yükün kendisine, üçüncü kişilere, onların mallarına veya çevreye zarar verebilecek özel niteliklerini, ayrıca özel taşıma koşulları gerektiren yük özelliklerini belirtmekle yükümlüdür.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_8',
      itemNumber: '3.8.',
      contentRu: 'Клиент производит расчеты с Экспедитором на условиях и в сроки, установленные настоящим договором.',
      contentEn: 'The Client shall make settlements with the Forwarder on the terms and within the time limits established by this Agreement.',
      contentTr: 'Müşteri, işbu sözleşme ile belirlenen şartlar ve süreler dahilinde Taşıyıcı ile hesaplaşmaları gerçekleştirir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_9',
      itemNumber: '3.9.',
      contentRu: 'В случае если Экспедитор (Перевозчик) в ходе исполнения настоящего договора понес дополнительные расходы, предвидеть которые он не мог при получении заявки Клиента (конвоирование, сбор за превышение нагрузки на ось, помещение транспортного средства с грузом на СВХ и т.п.), Клиент обязан возместить их при условии документального подтверждения непредвиденных расходов.',
      contentEn: 'In the event that the Forwarder (Carrier), in the course of performance of this Agreement, has incurred additional expenses which it could not foresee upon receipt of the Client\'s order (escort, fee for exceeding axle load limits, placing the vehicle with cargo in a temporary storage warehouse, etc.), the Client shall be obliged to reimburse them subject to documentary confirmation of such unforeseen expenses.',
      contentTr: 'Taşıyıcının işbu sözleşmenin ifası sırasında, Müşterinin talebini aldığı sırada öngöremediği ek masraflara (refakat/konvoy ücreti, aks yükü aşım harcı, yükle birlikte aracın geçici depolama yerine alınması vb.) maruz kalması halinde Müşteri, söz konusu öngörülemeyen masrafların belgelenmesi şartıyla bunları tazmin etmekle yükümlüdür.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_10',
      itemNumber: '3.10.',
      contentRu: 'Предоставить всю необходимую для экспорта, импорта и транзита документацию.',
      contentEn: 'Provide all documentation necessary for export, import, and transit.',
      contentTr: 'İhracat, ithalat ve transit işlemler için gerekli tüm dokümantasyonu sağlamak.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_11',
      itemNumber: '3.11.',
      contentRu: 'Клиент обязуется самостоятельно либо через грузоотправителя обеспечить оформление товарно-транспортной накладной (CMR), присоединить к ней или предоставить в распоряжение Экспедитора необходимые документы для выполнения таможенных процедур и иных формальностей.',
      contentEn: 'The Client undertakes, independently or through the shipper, to ensure the issuance of the international consignment note (CMR), attach to it or place at the Forwarder\'s disposal the necessary documents for the performance of customs procedures and other formalities.',
      contentTr: 'Müşteri, gümrük prosedürlerinin ve diğer formalitelerin yerine getirilmesi için gerekli tüm bilgileri içeren uluslararası yol bilgi belgesini (CMR) bizzat veya gönderici vasıtasıyla düzenlemeyi, gerekli belgeleri faturaya eklemeyi veya Taşıyıcının tasarrufuna sunmayı taahhüt eder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_12',
      itemNumber: '3.12.',
      contentRu: 'Клиент отвечает за все последствия неправильной внутренней упаковки грузов (бой, поломку, деформацию, течь и др.), а также применения тары и упаковки, не соответствующих свойствам груза.',
      contentEn: 'The Client shall be liable for all consequences of improper internal packaging of goods (breakage, damage, deformation, leakage, etc.), as well as the use of containers and packaging that do not correspond to the properties of the cargo.',
      contentTr: 'Müşteri, malların iç ambalajının uygunsuz olmasından kaynaklanan tüm sonuçlardan (kırılma, hasar, deformasyon, sızıntı vb.) ve ayrıca yükün özelliklerine uymayan kap ve ambalajların kullanılmasından sorumludur.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_13',
      itemNumber: '3.13.',
      contentRu: 'Покрыть расходы, непредусмотренные договором, возникшие во время перевозки груза в связи с перевесом, превышением веса транспортного средства.',
      contentEn: 'Cover expenses not provided for by the agreement, which arose during the transportation of cargo due to overweight, exceeding the weight of the vehicle beyond the permissible load capacity limit.',
      contentTr: 'Yükün taşınması sırasında aşırı kilo, aracın izin verilen taşıma kapasitesi sınırının üzerinde yüklenmesi nedeniyle ortaya çıkan sözleşme dışı masrafları karşılamak.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_14',
      itemNumber: '3.14.',
      contentRu: 'Клиент гарантирует соответствие упаковки груза условиям его перевозки.',
      contentEn: 'The Client guarantees the compliance of the cargo packaging with the conditions of its transportation.',
      contentTr: 'Müşteri, yük ambalajının taşıma koşullarına uygunluğunu garanti eder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's3_15',
      itemNumber: '3.15.',
      contentRu: 'Для текущих контактов, связанных с выполнением настоящего договора, Клиент назначает следующих лиц: менеджера infouz@logitransport.com.',
      contentEn: 'For current contacts related to the performance of this Agreement, the Client appoints the following persons: Manager infouz@logitransport.com.',
      contentTr: 'İşbu sözleşmenin ifası ile ilgili mevcut temaslar için Müşteri şu kişileri görevlendirir: Müdür infouz@logitransport.com.',
      isActive: true,
      isHeader: false,
    },

    // ─── Section 4 ───────────────────────────────────────────────────────────
    {
      id: 's4',
      itemNumber: '4.',
      contentRu: 'ПОРЯДОК РАСЧЕТОВ',
      contentEn: 'PAYMENT AND SETTLEMENT PROCEDURE',
      contentTr: 'ÖDEME VE HESAPLAŞMA USULÜ',
      isActive: true,
      isHeader: true,
    },
    {
      id: 's4_1',
      itemNumber: '4.1.',
      contentRu: `Валютой платежа является ${currencyNameRu}.`,
      contentEn: `The currency of payment shall be the ${currencyNameEn}.`,
      contentTr: `Ödeme para birimi ${currencyNameTr}.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's4_2',
      itemNumber: '4.2.',
      contentRu: `Ориентировочная общая сумма Контракта составляет ${formatContractAmount(amt, cur)}, фактическая сумма формируется путем сложения стоимостей, указанных в Заявках, которые являются неотъемлемой частью настоящего договора.`,
      contentEn: `The approximate total amount of the Contract is ${formatContractAmountLocale(amt, cur, 'en')}; the actual amount is formed by summing up the costs specified in the Orders, which are an integral part of this Agreement.`,
      contentTr: `Sözleşmenin tahmini toplam tutarı ${formatContractAmountLocale(amt, cur, 'tr')} olup, fiili tutar işbu sözleşmenin ayrılmaz bir parçası olan Taleplerde belirtilen bedellerin toplanmasıyla oluşur.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's4_3',
      itemNumber: '4.3.',
      contentRu: 'Комиссия банка оплачивается за счет Клиента.',
      contentEn: 'Bank commissions shall be paid at the expense of the Client.',
      contentTr: 'Banka komisyonları Müşteri tarafından ödenir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's4_4',
      itemNumber: '4.4.',
      contentRu: 'Сверка расчетов за перевозки и связанные с ними операции производится по требованию одной из сторон. Если получившая акт сверки расчетов сторона не подпишет его и не заявит своих возражений в течение 10 дней после его получения, акт сверки расчетов будет считаться утвержденным сторонами.',
      contentEn: 'Reconciliation of settlements for transportations and related operations shall be performed upon request of either Party. If the Party that received the reconciliation statement fails to sign it and does not state its objections within 10 days after receipt, the reconciliation statement shall be deemed approved by the Parties.',
      contentTr: 'Taşımalar ve bunlarla ilgili işlemler için hesap mutabakatı, Taraflardan birinin talebi üzerine yapılır. Mutabakat zaptını alan taraf, teslim aldıktan sonra 10 gün içinde imzalamaz ve itirazlarını bildirmezse, hesap mutabakat zaptı Taraflarca onaylanmış sayılır.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's4_5',
      itemNumber: '4.5.',
      contentRu: `После выполнения заявки, но не позднее 25-го числа месяца, следующего за месяцем оказания услуги, Экспедитор направляет Клиенту Акт приёма оказанных услуг. Клиент в течение 5 (пяти) дней с момента получения акта обязан подписать его и вернуть Экспедитору либо в тот же срок направить свои возражения. По истечении указанного срока акт считается утверждённым Сторонами.

Если в Заявке не указан иной срок оплаты либо Заявка не оформлена, Клиент обязан произвести оплату в течение 5 (пяти) рабочих дней с момента получения счёта.`,
      contentEn: `After the execution of the order, but no later than the 25th day of the month following the month of service rendering, the Forwarder shall send to the Client the Certificate of Services Rendered. The Client shall, within 5 (five) days from the date of receipt of the certificate, sign it and return it to the Forwarder or send its objections within the same time limit. Upon expiry of the specified period, the certificate shall be deemed approved by the Parties.

If no other payment term is specified in the Order or if the Order is not executed, the Client shall make the payment within 5 (five) working days from the moment of receipt of the invoice.`,
      contentTr: `Talebin yerine getirilmesinden sonra, ancak hizmetin sunulduğu ayı takip eden ayın en geç 25. gününe kadar Taşıyıcı, Müşteriye Hizmet Teslim Tutanağını gönderir. Müşteri, tutanağı aldığı tarihten itibaren 5 (beş) gün içinde imzalamak ve Taşıyıcıya iade etmek veya aynı süre içinde itirazlarını bildirmekle yükümlüdür. Belirtilen sürenin bitiminde tutanak Taraflarca onaylanmış sayılır.

Talep Formunda başka bir ödeme süresi belirtilmemişse veya Talep Formu düzenlenmemişse Müşteri, faturayı aldığı tarihten itibaren 5 (beş) iş günü içinde ödemeyi yapmakla yükümlüdür.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's4_6',
      itemNumber: '4.6.',
      contentRu: 'Зачет встречных требований допускается только по письменному взаимному соглашению сторон.',
      contentEn: 'Offset of mutual claims shall be permitted only by written mutual agreement of the Parties.',
      contentTr: 'Karşılıklı alacakların takası (mahsubu) ancak Tarafların yazılı ve karşılıklı mutabakatı ile mümkündür.',
      isActive: true,
      isHeader: false,
    },

    // ─── Section 5 ───────────────────────────────────────────────────────────
    {
      id: 's5',
      itemNumber: '5.',
      contentRu: 'ОТВЕТСТВЕННОСТЬ СТОРОН',
      contentEn: 'LIABILITY OF THE PARTIES',
      contentTr: 'TARAFLARIN SORUMLULUĞU',
      isActive: true,
      isHeader: true,
    },
    {
      id: 's5_1',
      itemNumber: '5.1.',
      contentRu: 'Стороны настоящего договора несут ответственность за неисполнение или ненадлежащее исполнение настоящего договора в соответствии с применимым международным правом и законодательством страны, где расположен суд.',
      contentEn: 'The Parties to this Agreement shall bear liability for non-performance or improper performance of this Agreement in accordance with the applicable international law and the laws of the country where the court is located.',
      contentTr: 'İşbu sözleşmenin Tarafları, sözleşmenin yerine getirilmemesi veya gereği gibi yerine getirilmemesi durumunda, uygulanabilir uluslararası hukuk ve davanın görüldüğü mahkemenin bulunduğu ülkenin mevzuatı uyarınca sorumluluk taşırlar.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_2',
      itemNumber: '5.2.',
      contentRu: `В случае срыва перевозки по вине Клиента (если информация, переданная в заявке, оказалась недостоверной, либо Клиент отказался от перевозки после подтверждения Экспедитором заявки и т.п.), Клиент выплачивает Экспедитору штраф в размере 200 (двести) долларов США.

При этом дни простоя на загрузке, предшествовавшие срыву перевозки, оплачиваются Клиентом дополнительно в размере 100 (сто) долларов США за каждый день простоя, начиная со дня прибытия автомобиля на загрузку.`,
      contentEn: `In the event of cancellation of transportation due to the fault of the Client (if the information transmitted in the order turned out to be unreliable, or the Client refused transportation after confirmation of the order by the Forwarder, etc.), the Client shall pay the Forwarder a fine in the amount of 200 (two hundred) US Dollars.

At the same time, the days of demurrage at loading preceding the cancellation of transportation shall be paid by the Client additionally in the amount of 100 (one hundred) US Dollars for each day of demurrage, starting from the day of arrival of the vehicle for loading.`,
      contentTr: `Taşımanın Müşterinin kusuru nedeniyle iptal edilmesi durumunda (talepte iletilen bilgilerin güvenilmez çıkması veya Taşıyıcının talebi onaylamasından sonra Müşterinin taşımadan vazgeçmesi vb.), Müşteri Taşıyıcıya 200 (iki yüz) ABD Doları tutarında cezai şart öder.

Bu durumda, taşımanın iptal edilmesinden önce yüklemede geçen bekleme günleri, aracın yüklemeye varış gününden itibaren başlamak üzere, her bir bekleme günü için Müşteri tarafından ayrıca 100 (yüz) ABD Doları tutarında ödenir.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_3',
      itemNumber: '5.3.',
      contentRu: 'В случае срыва перевозки по вине Экспедитора (Экспедитор отказался от исполнения своих обязательств после подтверждения принятия заявки), Экспедитор уплачивает Клиенту штраф в размере 200 (двести) долларов США.',
      contentEn: 'In the event of cancellation of transportation due to the fault of the Forwarder (the Forwarder refused to perform its obligations after confirmation of acceptance of the order), the Forwarder shall pay the Client a fine in the amount of 200 (two hundred) US Dollars.',
      contentTr: 'Taşımanın Taşıyıcının kusuru nedeniyle iptal edilmesi durumunda (Taşıyıcının talebi kabul ettiğini onayladıktan sonra yükümlülüklerini yerine getirmeyi reddetmesi), Taşıyıcı Müşteriye 200 (iki yüz) ABD Doları tutarında cezai şart öder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_4',
      itemNumber: '5.4.',
      contentRu: 'В случае перепробега транспортных средств по вине Клиента он выплачивает Экспедитору неустойку в размере эквивалентную 0,8 Евро за каждый км холостого пробега (перепробега).',
      contentEn: 'In the event of excess mileage of transport vehicles due to the fault of the Client, the Client shall pay the Forwarder a penalty in an amount equivalent to 0.8 Euros per each km of empty run (excess mileage).',
      contentTr: 'Müşterinin kusuru nedeniyle nakliye araçlarının fazla kilometre yapması durumunda, Müşteri Taşıyıcıya boş katedilen (fazla yapılan) her bir kilometre için 0,8 Euro\'ya eşdeğer tutarda bir ceza öder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_5',
      itemNumber: '5.5.',
      contentRu: 'За нарушение сроков подачи транспортного средства под погрузку/разгрузку Экспедитор уплачивает Клиенту неустойку в размере 100 (сто) долларов США за каждый полный день просрочки.',
      contentEn: 'For violation of the time limits for providing a transport vehicle for loading/unloading, the Forwarder shall pay the Client a penalty in the amount of 100 (one hundred) US Dollars for each full day of delay.',
      contentTr: 'Nakliye aracının yükleme/boşaltma için zamanında hazır bulundurulmaması halinde Taşıyıcı, Müşteriye gecikilen her tam gün için 100 (yüz) ABD Doları tutarında gecikme cezası öder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_6',
      itemNumber: '5.6.',
      contentRu: `В случае задержки автомобиля под погрузкой, выгрузкой или таможенным оформлением сверх установленных сроков, Клиент оплачивает Экспедитору неустойку в размере 100 (сто) долларов США за каждый день простоя.

В случае задержки транспортного средства на границе (отсутствие необходимых документов на груз, неполнота, неточность, недостоверность информации о свойствах груза и его перевозки, ожидание конвоирования, др.) Клиент оплачивает Экспедитору неустойку в размере 100 (сто) долларов США за каждый день простоя.`,
      contentEn: `In the event of delay of the vehicle under loading, unloading, or customs clearance beyond the established time limits, the Client shall pay the Forwarder a penalty in the amount of 100 (one hundred) US Dollars for each day of demurrage.

In the event of delay of the transport vehicle at the border (absence of necessary documents for the cargo, incompleteness, inaccuracy, unreliability of information about the properties of the cargo and its transportation, waiting for escort, etc.), the Client shall pay the Forwarder a penalty in the amount of 100 (one hundred) US Dollars for each day of demurrage.`,
      contentTr: `Aracın yükleme, boşaltma veya gümrük işlemleri altında belirlenen sürelerin üzerinde gecikmesi durumunda Müşteri, Taşıyıcıya her bir bekleme günü için 100 (yüz) ABD Doları tutarında gecikme cezası öder.

Nakliye aracının sınırda gecikmesi durumunda (yük için gerekli belgelerin bulunmaması, yükün özellikleri hakkındaki bilgilerin eksik, yanlış veya güvenilmez olması, konvoy beklenmesi vb.), Müşteri Taşıyıcıya her bir bekleme günü için 100 (yüz) ABD Doları tutarında gecikme cezası öder.`,
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_7',
      itemNumber: '5.7.',
      contentRu: 'При несоблюдении сроков оплаты Клиент выплачивает Экспедитору пеню в размере 0,15% от неоплаченной суммы за каждый день просрочки.',
      contentEn: 'In case of non-compliance with payment deadlines, the Client shall pay the Forwarder a late payment penalty (interest) in the amount of 0.15% of the unpaid amount for each day of delay.',
      contentTr: 'Ödeme sürelerine uyulmaması halinde Müşteri, Taşıyıcıya gecikilen her gün için ödenmeyen tutarın %0,15\'i oranında gecikme faizi öder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_8',
      itemNumber: '5.8.',
      contentRu: 'Оплата штрафных санкций производится в течение 2-х банковских дней после получения претензии, подтверждающих документов и счета на оплату.',
      contentEn: 'Payment of penalties and fines shall be made within 2 bank business days after receipt of the claim, supporting documents, and the invoice for payment.',
      contentTr: 'Cezai yaptırımların ödenmesi, ihtarın, destekleyici belgelerin ve ödeme faturasının alınmasından itibaren 2 banka iş günü içinde gerçekleştirilir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_9',
      itemNumber: '5.9.',
      contentRu: 'Уплата штрафных санкций не освобождает стороны от исполнения обязательств по настоящему договору и от обязанности возместить причиненный ущерб.',
      contentEn: 'The payment of penalties and fines shall not relieve the Parties from the performance of obligations under this Agreement and from the obligation to compensate for the damage caused.',
      contentTr: 'Cezai yaptırımların ödenmesi, Tarafları işbu sözleşme kapsamındaki yükümlülüklerini yerine getirmekten ve meydana gelen zararı tazmin etme yükümlülüğünden kurtarmaz.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_10',
      itemNumber: '5.10.',
      contentRu: 'Выставление штрафных санкций является правом каждой из сторон.',
      contentEn: 'Invoking punitive sanctions (fines/penalties) is a right, not an obligation, of each Party.',
      contentTr: 'Cezai yaptırımların uygulanması, Taraflardan her birinin bir hakkı olup zorunluluk değildir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_11',
      itemNumber: '5.11.',
      contentRu: 'Стороны не несут ответственности по любым не прямым убыткам, упущенной выгоде.',
      contentEn: 'The Parties shall not be liable for any indirect damages, loss of profit.',
      contentTr: 'Taraflar; dolaylı zarar ve mahrum kalınan kardan sorumlu değildir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_12',
      itemNumber: '5.12.',
      contentRu: 'Экспедитор не несет ответственность за содержимое отправления при целостности упаковки.',
      contentEn: 'The Forwarder shall not be liable for the contents of the shipment if the packaging is intact.',
      contentTr: 'Ambalajın bütünlüğü bozulmamışsa Taşıyıcı gönderinin içeriğinden sorumlu değildir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_13',
      itemNumber: '5.13.',
      contentRu: 'Экспедитор не несет ответственности за изменение качества груза вследствие естественных причин, связанных с перевозкой груза, норм естественной убыли.',
      contentEn: 'The Forwarder shall not be liable for changes in the quality of cargo due to natural causes related to the transportation of cargo, norms of natural weight loss.',
      contentTr: 'Yükün taşınmasıyla bağlantılı doğal nedenlerden kaynaklanan kalite değişikliklerinden, doğal fire oranlarından dolayı Taşıyıcı sorumlu değildir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_14',
      itemNumber: '5.14.',
      contentRu: 'Экспедитор не несет ответственности по настоящему Договору в случае введения государственными органами конвенционных запрещений на отгрузку/прием груза.',
      contentEn: 'The Forwarder shall not bear liability under this Agreement in case of introduction by state authorities of conventional prohibitions on the shipment/acceptance of cargo.',
      contentTr: 'Devlet organları tarafından konvansiyonel yasakların getirilmesi durumunda Taşıyıcı işbu Sözleşme kapsamında sorumluluk taşımaz.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's5_15',
      itemNumber: '5.15.',
      contentRu: `Клиент несет ответственность перед Экспедитором или третьим лицом, за свои собственные ошибки и упущения, в частности в отношении любых последствий, возникающих из-за того, что:

5.15.1. упаковка, тара не соответствует требованиям перевозки на согласованном виде транспорта;
5.15.2. сведения об упаковке, таре, маркировке и Грузе оказались неверными, неточными или отсутствующими;
5.15.3. отсутствуют или предоставлены с опозданием необходимые документы, неправильно оформлены;
5.15.4. были несвоевременные или ненадлежащие погрузка груза, крепление груза внутри транспортного средства, разгрузка груза в пункте назначения.`,
      contentEn: `The Client shall be liable to the Forwarder or a third party for its own errors and omissions, in particular regarding any consequences arising from the fact that:

5.15.1. the packaging or container does not correspond to the requirements of transportation on the agreed type of transport;
5.15.2. the information on packaging, container, marking, and Cargo turned out to be incorrect, inaccurate, or missing;
5.15.3. the necessary documents are missing or provided with delay, are incorrectly drafted;
5.15.4. there was untimely or improper loading of cargo, securing of cargo inside the transport vehicle, unloading of cargo at the destination point.`,
      contentTr: `Müşteri; kendi hata ve ihmallerinden, özellikle aşağıdakilerden kaynaklanan tüm sonuçlardan dolayı Taşıyıcıya veya üçüncü şahıslara karşı sorumludur:

5.15.1. Ambalajın veya kabın, anlaşılan taşıma türündeki taşıma gereksinimlerine uymaması;
5.15.2. Ambalaj, kap, markalama ve Yük hakkındaki bilgilerin yanlış, eksik veya mevcut olmaması;
5.15.3. Gerekli belgelerin bulunmaması veya geç sunulması, yanlış düzenlenmesi;
5.15.4. Yükün zamansız veya usulüne uygun olmayan şekilde yüklenmesi, araç içinde sabitlenmesi, varış noktasında boşaltılması.`,
      isActive: true,
      isHeader: false,
    },

    // ─── Section 6 ───────────────────────────────────────────────────────────
    {
      id: 's6',
      itemNumber: '6.',
      contentRu: 'ПОРЯДОК УРЕГУЛИРОВАНИЯ СПОРОВ',
      contentEn: 'DISPUTE RESOLUTION PROCEDURE',
      contentTr: 'UYUŞMAZLIKLARIN ÇÖZÜMÜ USULÜ',
      isActive: true,
      isHeader: true,
    },
    {
      id: 's6_1',
      itemNumber: '6.1.',
      contentRu: 'Споры и разногласия, возникшие из настоящего договора, разрешаются сторонами путем переговоров или в претензионном порядке.',
      contentEn: 'Disputes and disagreements arising out of this Agreement shall be resolved by the Parties through negotiations or via a formal complaint (claim) procedure.',
      contentTr: 'İşbu sözleşmeden doğan uyuşmazlık ve anlaşmazlıklar, Taraflar arasında müzakereler yoluyla veya resmi ihtar/talep usulüyle çözülür.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_2',
      itemNumber: '6.2.',
      contentRu: 'К претензии должны быть приложены документы, подтверждающие обстоятельства, на которые ссылается заявитель претензии. Указанные документы предъявляются в подлиннике или в форме надлежаще заверенной копии.',
      contentEn: 'Documents confirming the circumstances to which the claimant refers must be attached to the claim. The specified documents shall be presented in the original or in the form of a duly certified copy.',
      contentTr: 'İhtara, hak talebinde bulunan tarafın dayandığı durumları kanıtlayan belgeler eklenmelidir. Söz konusu belgeler orijinal olarak veya usulüne uygun olarak tasdik edilmiş suret halinde sunulur.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_3',
      itemNumber: '6.3.',
      contentRu: 'Сторона, получившая претензию, обязана рассмотреть ее в течение 1 месяца с момента получения и представить ответ по существу претензии в письменном виде.',
      contentEn: 'The Party that received the claim is obliged to consider it within 1 month from the date of receipt and present a substantive response to the claim in writing.',
      contentTr: 'İhtarı alan Taraf, ihtarı aldığı tarihten itibaren 1 (bir) ay içinde incelemek ve ihtarın esasına ilişkin yazılı cevabını sunmakla yükümlüdür.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_4',
      itemNumber: '6.4.',
      contentRu: 'Срок рассмотрения претензии о просроченной задолженности по оплате Клиентом — 10 дней с момента получения претензии.',
      contentEn: 'The period for consideration of a claim regarding overdue payment debt by the Client is 10 days from the moment of receipt of the claim.',
      contentTr: 'Müşteri tarafından vadesi geçmiş ödeme borcuna ilişkin bir ihtarın incelenme süresi, ihtarın alınmasından itibaren 10 gündür.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_5',
      itemNumber: '6.5.',
      contentRu: 'Если спор не будет урегулирован в претензионном порядке, он передается на рассмотрение суда по месту нахождения истца.',
      contentEn: 'If the dispute is not resolved through the claim procedure, it shall be referred to the court at the location of the Plaintiff.',
      contentTr: 'Uyuşmazlığın ihtar usulüyle çözülememesi halinde, uyuşmazlık Davacının bulunduğu yerdeki mahkemenin kararına sunulur.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_6',
      itemNumber: '6.6.',
      contentRu: 'Стороны взаимно соглашаются со следующими положениями о подсудности в отношении любых споров, требований, задолженностей, убытков, компенсаций, процентов, договорных штрафов, исполнительных производств и иных юридических действий, возникающих из настоящего Договора, связанных с ним либо вытекающих из его заключения, толкования, исполнения, нарушения или прекращения.',
      contentEn: 'The Parties mutually agree to the following jurisdiction provisions with respect to any disputes, claims, receivables, damages, compensation, interest, contractual penalties, enforcement proceedings, and any other legal actions arising out of, relating to, or connected with the conclusion, interpretation, performance, breach, or termination of this Agreement.',
      contentTr: 'İşbu sözleşmenin kurulması, yorumlanması, uygulanması, ihlali, feshi veya sözleşme ile bağlantılı her türlü uyuşmazlık, alacak, tazminat, faiz, ceza şartı, icra takibi ve diğer hukuki işlemler bakımından taraflar aşağıdaki yetki düzenlemesini karşılıklı olarak kabul ederler.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_7',
      itemNumber: '6.7.',
      contentRu: 'Каждая из Сторон вправе инициировать судебные и иные юридические процедуры в компетентных судах и исполнительных органах государства своего местонахождения, а также в компетентных судах и исполнительных органах государства местонахождения другой Стороны, включая предъявление исков, взыскание задолженности, возбуждение исполнительного производства, ходатайство о принятии обеспечительных мер, наложении ареста на имущество и иных мер правовой защиты, предусмотренных применимым законодательством.',
      contentEn: 'Each Party shall have the right to initiate legal proceedings before the competent courts and enforcement authorities of the country in which it is established, as well as before the competent courts and enforcement authorities of the country in which the other Party is established, including the right to file claims, seek recovery of debts, commence enforcement proceedings, request interim measures, attachment orders, and any other remedies available under the applicable law.',
      contentTr: 'Taraflardan her biri, kendi merkezinin bulunduğu ülkenin yetkili mahkemeleri ve icra mercileri nezdinde hukuki süreç başlatma hakkına sahip olduğu gibi, diğer tarafın merkezinin bulunduğu ülkenin yetkili mahkemeleri ve icra mercileri nezdinde de dava açma, alacak talebinde bulunma, icra takibi başlatma, ihtiyati haciz ve diğer hukuki koruma tedbirlerini talep etme hakkına sahiptir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_8',
      itemNumber: '6.8.',
      contentRu: 'Стороны заранее, прямо и безотзывно признают неисключительную юрисдикцию судов и органов принудительного исполнения по месту нахождения Перевозчика, а также судов и органов принудительного исполнения по месту нахождения Заказчика.',
      contentEn: 'The Parties hereby expressly, irrevocably, and in advance accept the non-exclusive jurisdiction of the courts and enforcement authorities located at the place of establishment of the Carrier, as well as the courts and enforcement authorities located at the place of establishment of the Customer.',
      contentTr: 'Taraflar, Nakliyecinin merkezinin bulunduğu yer mahkemeleri ve icra mercileri ile Müşterinin merkezinin bulunduğu yer mahkemeleri ve icra mercilerinin münhasır olmayan yetkisini peşinen, açık ve geri alınamaz şekilde kabul ederler.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_9',
      itemNumber: '6.9.',
      contentRu: 'Обращение любой из Сторон в суд или иной компетентный орган государства своего местонахождения либо государства местонахождения другой Стороны не может служить основанием для заявления возражений относительно юрисдикции или подсудности. Стороны подтверждают, что заранее приняли компетенцию указанных в настоящем Договоре судов и органов принудительного исполнения.',
      contentEn: 'The initiation of legal proceedings by either Party in the country of its own establishment or in the country of establishment of the other Party shall not constitute grounds for any objection regarding jurisdiction or venue. The Parties acknowledge and confirm that they have accepted in advance the jurisdiction of the courts and enforcement authorities referred to in this Agreement.',
      contentTr: 'Taraflardan herhangi birinin kendi ülkesinde veya diğer tarafın ülkesinde hukuki süreç başlatması, diğer tarafça yetki itirazı sebebi olarak ileri sürülemez. Taraflar, işbu sözleşme kapsamında belirtilen mahkemelerin ve icra mercilerinin yetkisini önceden kabul ettiklerini beyan ederler.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_10',
      itemNumber: '6.10.',
      contentRu: 'Учитывая международный характер коммерческой деятельности Сторон, Стороны соглашаются, что кредитор вправе непосредственно инициировать судебное или иное юридическое производство в государстве местонахождения должника в целях эффективного взыскания задолженности и оперативного разрешения споров.',
      contentEn: 'Taking into account the international nature of the Parties\' commercial activities, the Parties agree that the creditor shall be entitled to commence legal proceedings directly in the country where the debtor is established for the purpose of efficient debt recovery and prompt resolution of disputes.',
      contentTr: 'Taraflar, uluslararası ticari faaliyetlerin niteliği gereği, alacakların etkin şekilde tahsil edilebilmesi amacıyla, alacaklı tarafın borçlu tarafın merkezinin bulunduğu ülkede doğrudan hukuki süreç başlatabilmesini kabul ederler.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_11',
      itemNumber: '6.11.',
      contentRu: 'Возбуждение судебного разбирательства или исполнительного производства в одном государстве не ограничивает право соответствующей Стороны, в пределах, допускаемых применимым законодательством, предпринимать иные юридические действия в другом государстве для защиты своих прав и законных интересов.',
      contentEn: 'The commencement of legal proceedings or enforcement actions in one country shall not prevent the relevant Party, to the extent permitted by applicable law, from taking legal actions in another country for the protection and enforcement of its rights and legitimate interests.',
      contentTr: 'Taraflardan birinin bir ülkede dava açmış veya icra takibi başlatmış olması, ilgili mevzuatın izin verdiği ölçüde diğer ülkelerde haklarının korunmasına yönelik hukuki işlemler yapmasına engel teşkil etmez.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's6_12',
      itemNumber: '6.12.',
      contentRu: 'Настоящее положение не ограничивает права Сторон, вытекающие из норм международного частного права, международных договоров, а также императивных норм законодательства соответствующих государств.',
      contentEn: 'Nothing in this Article shall limit the rights of the Parties arising under private international law, international treaties, or any mandatory provisions of applicable law.',
      contentTr: 'İşbu madde, tarafların uluslararası özel hukuk kurallarından, uluslararası anlaşmalardan ve ilgili ülkelerin emredici hukuk kurallarından kaynaklanan haklarını ortadan kaldırmaz.',
      isActive: true,
      isHeader: false,
    },

    // ─── Section 7 ───────────────────────────────────────────────────────────
    {
      id: 's7',
      itemNumber: '7.',
      contentRu: 'ОБСТОЯТЕЛЬСТВА НЕПРЕОДОЛИМОЙ СИЛЫ',
      contentEn: 'FORCE MAJEURE',
      contentTr: 'MÜCBİR SEBEPLER',
      isActive: true,
      isHeader: true,
    },
    {
      id: 's7_1',
      itemNumber: '7.1.',
      contentRu: 'Стороны освобождаются от ответственности за частичное или полное неисполнение своих обязательств, если невозможность исполнения была вызвана обстоятельствами непреодолимой силы: стихийные и природные бедствия, забастовки, запретительные акты государственных органов, обстоятельства вне воли сторон.',
      contentEn: 'The Parties shall be exempted from liability for partial or complete non-performance of their obligations if the impossibility of performance was caused by force majeure circumstances: natural disasters, strikes, prohibitive acts of state authorities, and circumstances beyond the control of the Parties.',
      contentTr: 'İfanın imkansızlığı mücbir sebeplerden kaynaklanmışsa Taraflar, yükümlülüklerini kısmen veya tamamen yerine getirmemekten dolayı sorumluluktan muaf tutulurlar: doğal afetler, grevler, devlet organlarının yasaklayıcı kararları ve Tarafların iradesi dışındaki durumlar.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's7_2',
      itemNumber: '7.2.',
      contentRu: 'Сторона, для которой создалась невозможность исполнения обязательства, обязана в течение 5 дней с момента наступления обстоятельств форс-мажор известить другую сторону об их наступлении, предполагаемом сроке действия и прекращении. Доказательством наступления и продолжительности действия обстоятельств является документ независимого компетентного органа соответствующей страны.',
      contentEn: 'The Party for which the impossibility of performance of the obligation arose is obliged to notify the other Party within 5 days from the moment of occurrence of force majeure circumstances about their occurrence, expected duration, and termination. A document issued by an independent competent authority of the relevant country shall serve as proof of the occurrence and duration of such circumstances.',
      contentTr: 'Yükümlülüğü yerine getirmesi imkansız hale gelen Taraf, mücbir sebebin ortaya çıktığı andan itibaren 5 gün içinde diğer Tarafa bunların ortaya çıkışı, tahmini geçerlilik süresi ve sona ermesi hakkında bildirimde bulunmakla yükümlüdür. Durumların kanıtı, ilgili ülkenin bağımsız yetkili makamının belgesidir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's7_3',
      itemNumber: '7.3.',
      contentRu: 'Не уведомление или несвоевременное уведомление лишает сторону права ссылаться на обстоятельства непреодолимой силы как на основание освобождения от ответственности.',
      contentEn: 'Failure to notify or untimely notification shall deprive the Party of the right to refer to force majeure circumstances as a ground for exemption from liability.',
      contentTr: 'Bildirimde bulunulmaması veya geç bildirimde bulunulması, ilgili Tarafı sorumluluktan muaf tutulma gerekçesi olarak mücbir sebeplere dayanma hakkından mahrum bırakır.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's7_4',
      itemNumber: '7.4.',
      contentRu: 'Если любое из таких обстоятельств непосредственно повлияет на исполнение обязательств в срок, установленный в договоре, то этот срок продлевается на срок действия обстоятельств непреодолимой силы.',
      contentEn: 'If any of such circumstances directly affect the performance of obligations within the time limit established in the agreement, then this time limit shall be extended for the duration of the force majeure circumstances.',
      contentTr: 'Bu tür durumlardan herhangi birinin sözleşmede belirlenen süre içindeki yükümlülüklerin ifasını doğrudan etkilemesi halinde, bu süre mücbir sebeplerin geçerlilik süresi kadar uzatılır.',
      isActive: true,
      isHeader: false,
    },

    // ─── Section 8 ───────────────────────────────────────────────────────────
    {
      id: 's8',
      itemNumber: '8.',
      contentRu: 'ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ',
      contentEn: 'ADDITIONAL CONDITIONS',
      contentTr: 'EK KOŞULLAR',
      isActive: true,
      isHeader: true,
    },
    {
      id: 's8_1',
      itemNumber: '8.1.',
      contentRu: 'Настоящий Договор вступает в силу с даты его подписания уполномоченными представителями Сторон и действует в течение 1 (одного) календарного года с даты подписания. Каждая из Сторон вправе расторгнуть настоящий Договор путем направления другой Стороне письменного уведомления не позднее чем за 30 (тридцать) календарных дней до предполагаемой даты прекращения его действия. В случае если уведомление о расторжении не будет направлено в указанный срок, настоящий Договор считается автоматически продлённым на каждый последующий срок продолжительностью 1 (один) календарный год на тех же условиях без необходимости совершения каких-либо дополнительных действий или направления дополнительных уведомлений.',
      contentEn: 'This Agreement shall enter into force on the date of its execution by the duly authorized representatives of the Parties and shall remain valid for a period of 1 (one) calendar year from the date of execution. Either Party shall have the right to terminate this Agreement by providing the other Party with written notice no later than 30 (thirty) calendar days prior to the intended date of termination. Should no notice of termination be provided within the aforementioned period, this Agreement shall be deemed automatically renewed for successive periods of 1 (one) calendar year each, on the same terms and conditions, without the need for any additional action or further notice by either Party.',
      contentTr: 'İşbu Sözleşme, Tarafların yetkili temsilcileri tarafından imzalandığı tarihte yürürlüğe girer ve imza tarihinden itibaren 1 (bir) takvim yılı süreyle geçerlidir. Taraflardan her biri, Sözleşmeyi öngörülen sona erme tarihinden en geç 30 (otuz) takvim günü önce diğer Tarafa yazılı bildirimde bulunmak suretiyle feshedebilir. Belirtilen süre içerisinde fesih bildiriminin yapılmaması halinde, işbu Sözleşme herhangi bir ek işleme veya bildirime gerek olmaksızın her defasında 1 (bir) takvim yılı süreyle aynı şart ve koşullarla kendiliğinden uzatılmış sayılır.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's8_2',
      itemNumber: '8.2.',
      contentRu: 'Все дополнения и изменения к настоящему договору действительны лишь в том случае, если они совершены в письменной форме, подписаны Сторонами и заверены печатями.',
      contentEn: 'All amendments and modifications to this Agreement shall be valid only if they are made in writing, signed by the Parties, and sealed.',
      contentTr: 'İşbu sözleşmeye yapılacak tüm eklemeler ve değişiklikler, ancak yazılı olarak yapılması, Taraflarca imzalanması ve mühürlenmesi halinde geçerlidir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's8_3',
      itemNumber: '8.3.',
      contentRu: 'В целях оперативности и срочности решения вопросов настоящий договор и связанные с ним документы могут быть изготовлены и переданы с помощью электронных или факсимильных средств связи. Электронные и факсимильные копии документов приравниваются к оригиналам до момента получения сторонами оригиналов соответствующих документов.',
      contentEn: 'For the purpose of operational efficiency and urgency of resolving issues, this Agreement and related documents may be prepared and transmitted by electronic or facsimile communication means. Electronic and facsimile copies of documents shall be equated to originals until the Parties receive the originals of the respective documents.',
      contentTr: 'Sorunların hızlı ve acil çözümü amacıyla, işbu sözleşme ve bununla ilgili belgeler elektronik veya faks iletişim araçları yardımıyla hazırlanabilir ve iletilebilir. Belgelerin elektronik ve faks kopyaları, Taraflar ilgili belgelerin asıllarını alana kadar asıllarına eşdeğer kabul edilir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's8_4',
      itemNumber: '8.4.',
      contentRu: 'В ходе совместной работы каждая сторона обязуется соблюдать коммерческие интересы другой стороны, сохранять нейтральность в отношениях с её клиентами, не разглашать полученную или ставшую известной коммерческую информацию.',
      contentEn: 'In the course of joint work, each Party undertakes to respect the commercial interests of the other Party, maintain neutrality in relations with its clients, and not disclose commercial information received or made known.',
      contentTr: 'Ortak çalışma sürecinde her bir Taraf, diğer Tarafın ticari menfaatlerine uymayı, onun müşterileriyle olan ilişkilerinde tarafsızlığı korumayı, elde edilen veya vakıf olunan ticari bilgileri ifşa etmemeyi taahhüt eder.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's8_5',
      itemNumber: '8.5.',
      contentRu: 'Стороны обязуются в течение 10 дней письменно информировать друг друга об изменении наименования организации, ее юридического и почтового адреса, банковских реквизитов, изменений в руководстве.',
      contentEn: 'The Parties undertake to inform each other in writing within 10 days of any change in the name of the organization, its legal and postal address, banking details, or changes in management.',
      contentTr: 'Taraflar; kuruluş adının, yasal ve posta adresinin, banka bilgilerinin, yönetimdeki değişikliklerin değişmesi durumunda 10 gün içinde birbirlerini yazılı olarak bilgilendirmeyi taahhüt ederler.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's8_6',
      itemNumber: '8.6.',
      contentRu: 'Настоящий договор оформлен в 2-х экземплярах по одному экземпляру для каждой из сторон.',
      contentEn: 'This Agreement is drawn up in 2 copies, one copy for each of the Parties.',
      contentTr: 'İşbu sözleşme, Taraflardan her biri için birer nüsha olmak üzere 2 nüsha halinde düzenlenmiştir.',
      isActive: true,
      isHeader: false,
    },
    {
      id: 's8_7',
      itemNumber: '8.7.',
      contentRu: 'В случае наличия текста настоящего Договора на языках, отличных от русского, и возникновения между такими версиями каких-либо противоречий, расхождений, несоответствий, различий в толковании, ошибок перевода либо различий в смысловом содержании, преимущественную юридическую силу имеет текст Договора на русском языке. Русскоязычная версия Договора считается основной, обязательной и имеющей приоритет перед всеми иными языковыми версиями.',
      contentEn: 'In the event that this Agreement exists in one or more languages other than Russian, and any discrepancy, inconsistency, conflict, difference in interpretation, translation error, or divergence in meaning arises between such language versions, the Russian-language version shall prevail and shall have governing legal effect. The Russian-language version shall be deemed the original, binding, and controlling version of this Agreement and shall take precedence over all other language versions.',
      contentTr: 'İşbu Sözleşmede Rusça dışında başka dil veya dillerde hazırlanmış metinlerin mevcut olması halinde, söz konusu metinler arasında herhangi bir çelişki, farklılık, uyumsuzluk veya anlam uyuşmazlığı bulunması durumunda Rusça metin esas alınacak olup, Rusça metin işbu Sözleşmenin asli, bağlayıcı ve öncelikli metni olarak kabul edilecektir.',
      isActive: true,
      isHeader: false,
    },
  ];

  return items.map((item, idx) => ({ ...item, sortOrder: idx + 1 })) as FlatClauseItem[];
}

/** Legacy compat: keep generateClauses for old code references but now unused */
export { generateFlatClauses as generateClauses };
