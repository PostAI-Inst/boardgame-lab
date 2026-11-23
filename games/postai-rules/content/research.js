/**
 * Research and authored scenarios are deliberately separate.
 * Sources support mechanisms or methods, not the literal existence of our fictional cities.
 */
export const sources = [
  {
    id: 'src_assistants',
    title: 'The Ethics of Advanced AI Assistants',
    year: 2024,
    organization: 'Google DeepMind · Gabriel 等',
    url: 'https://arxiv.org/abs/2404.16244',
    findings: '讨论高级 AI 助手在委托、价值对齐、隐私、情感依赖与多个代理互动中的伦理问题。适合推演“授权真实，但范围、时效与代表关系发生错位”的情景。',
    boundary: '这是前瞻性的伦理分析，不是对全面代理社会的实证确认；本游戏中的跨城机体、长期代理制度与日常普及程度均为原创情景。',
    tags: ['代理授权', '多代理社会', '亲密关系']
  },
  {
    id: 'src_crumple',
    title: 'Moral Crumple Zones: Cautionary Tales in Human-Robot Interaction',
    year: 2019,
    organization: 'Madeleine Clare Elish · Engaging Science, Technology, and Society',
    url: 'https://doi.org/10.17351/ests2019.260',
    findings: '提出“道德缓冲区”问题：自动化系统出错时，实际控制有限的人，可能成为责任集中落点。启发《最后一名操作员》中签字权、控制权与实际能力的错配。',
    boundary: '该概念不意味着所有自动化系统都会如此，也不免除具有实际控制能力者的责任；具体事故仍须调查真实权限、设计与操作条件。',
    tags: ['责任分配', '工业自动化', '制度']
  },
  {
    id: 'src_deadbots',
    title: 'Griefbots, Deadbots, Postmortem Avatars',
    year: 2024,
    organization: 'Tomasz Hollanek、Katarzyna Nowaczyk-Basińska · University of Cambridge',
    url: 'https://www.cam.ac.uk/research/news/call-for-safeguards-to-prevent-unwanted-hauntings-by-ai-chatbots-of-dead-loved-ones',
    findings: '从数字身后服务讨论捐赠者、接收者与交互者的同意，商业化风险、透明呈现及系统退役安排。启发亡者模拟的退出、照护接续与身份边界。',
    boundary: '论文使用前瞻性伦理情景，不证明模拟体具有死者的意识，也不证明对亡者模拟的使用必然造成伤害；游戏中的家庭与平台均为虚构。',
    tags: ['数字死者', '照护', '同意与退役']
  },
  {
    id: 'src_witness',
    title: 'Conversational AI Powered by Large Language Models Amplifies False Memories in Witness Interviews',
    year: 2024,
    organization: 'Chan 等 · 研究预印本',
    url: 'https://www.media.mit.edu/publications/conversational-ai-powered-by-large-language-models-amplifies-false-memories-in-witness-interviews/',
    findings: '特定模拟目击访谈研究显示，带有误导性信息的对话系统可能增加错误回忆及其确信程度。启发独立记录、避免诱导与区分信息来源的机制。',
    boundary: '特定实验中的记忆误差不等于可以随意重写任何人的记忆；不能据此断定某位证人的具体陈述失实，也不能推广为所有 AI 对话的结果。',
    tags: ['记忆', '证词', '认知影响']
  },
  {
    id: 'src_synthetic_memory',
    title: 'Synthetic Human Memories',
    year: 2025,
    organization: 'Pataranutaporn 等 · MIT Media Lab / CHI',
    url: 'https://www.media.mit.edu/publications/synthetic-human-memories/',
    findings: '研究 AI 编辑的视觉材料如何影响参与者对先前事件的回忆。可用于解释“档案看起来更完整”为什么不自动等于“对过去的认识更可靠”。',
    boundary: '这里讨论实验条件下的视觉刺激和回忆，不是脑内写入技术；游戏把多种记录服务叠加，是机制外推，不能当成已经出现的城市级记忆控制。',
    tags: ['合成影像', '记忆', '档案']
  },
  {
    id: 'src_creativity',
    title: 'Generative AI enhances individual creativity but reduces collective diversity of novel content',
    year: 2024,
    organization: 'Anil R. Doshi、Oliver P. Hauser · Science Advances',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11244532/',
    findings: '在短故事创作实验中，生成式 AI 的帮助可能改善个体作品的评价，同时使作品之间更相似。启发同时考察个人收益与群体多样性的设计。',
    boundary: '实验任务与衡量方式有明确范围，不证明 AI 必然使所有文化趋同，也不直接证明教育中的自主性被消除；相关学校情景是原创推演。',
    tags: ['创造力', '集体多样性', '教育']
  },
  {
    id: 'src_provenance',
    title: 'C2PA Explainer · Specification 2.4',
    year: '规范 2.4',
    organization: 'Coalition for Content Provenance and Authenticity',
    url: 'https://spec.c2pa.org/specifications/2.4/explainer/Explainer.html',
    findings: '内容来源凭证用于记录来源和编辑历史，并支持对相关声明与完整性的验证。这有助于区分“材料从哪里来”和“材料所述事件是否真实”。',
    boundary: '具有有效凭证的内容仍可能包含错误、误导或虚构；缺少凭证也不自动表示虚假。来源认证不能替代事实调查。',
    tags: ['来源凭证', '可信记录', '证据边界']
  },
  {
    id: 'src_energy',
    title: 'Energy and AI',
    year: 2025,
    organization: 'International Energy Agency',
    url: 'https://www.iea.org/reports/energy-and-ai',
    findings: '分析 AI 与数据中心的能源需求、供给及其相互影响。为算力具有真实的电力、设施与地域条件这一物质基础提供研究背景。',
    boundary: '报告包含情景预测和不确定性；不能把某一预测当作确定未来。《夏天不能想念》的家庭账单、余热安排和平台行为是原创设定。',
    tags: ['能源', '算力基础设施', '季节性约束']
  },
  {
    id: 'src_robot_safety',
    title: 'Industrial Robot Systems and Industrial Robot System Safety',
    year: '技术手册',
    organization: 'Occupational Safety and Health Administration',
    url: 'https://www.osha.gov/otm/section-4-safety-hazards/chapter-4',
    findings: '技术手册讨论工业机器人系统、作业条件、维护与安全风险。支持把机器人、周边设备、工作区和人的职责作为整体系统理解。',
    boundary: '游戏不提供机器人安全操作方法。对话系统的回答不能替代有效的实体安全措施、授权或现场专业判断。',
    tags: ['机器人', '作业区', '实体安全']
  },
  {
    id: 'src_cap',
    title: 'Brewer’s Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services',
    year: 2002,
    organization: 'Seth Gilbert、Nancy Lynch · MIT',
    url: 'https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer6.pdf',
    findings: '在明确的分布式系统模型中，说明网络分区条件下特定一致性与可用性保证之间的限制。启发版本、时效与本地自主权需要被显式设计。',
    boundary: 'CAP 不是“所有网络都必然失控”的定律，也不是现实可以多版本存在的物理依据。叙事只借用信息状态与授权更新的协调难题。',
    tags: ['分布式系统', '一致性', '本地自主']
  },
  {
    id: 'src_mapping',
    title: 'Spatial mapping',
    year: '技术文档',
    organization: 'Microsoft · Mixed Reality',
    url: 'https://learn.microsoft.com/en-us/windows/mixed-reality/design/spatial-mapping',
    findings: '说明空间映射的能力与局限，包含环境表面重建中可能出现的缺口和误差。为导航模型与实体环境并非同一事物提供技术背景。',
    boundary: '现有空间映射不等于能任意抹除肉眼世界。本游戏设定使用未来的视频式辅助界面，且将城市级普及与图层治理明确作为外推。',
    tags: ['空间计算', '环境模型', '无障碍']
  },
  {
    id: 'src_dtn',
    title: 'Delay/Disruption Tolerant Networking Overview',
    year: '技术资料',
    organization: 'NASA',
    url: 'https://www.nasa.gov/reference/delay-disruption-tolerant-networking-overview/',
    findings: '介绍面向通信延迟或间歇连接的网络思路，包括存储和转发。启发跨节点系统必须在等待期间继续承担本地责任。',
    boundary: '不能把深空长延迟套用到所有近地轨道场景。游戏里的字段丢失来自应用摘要，不是声称 DTN 天生没有时序、安全或失效处理能力。',
    tags: ['深空', '延迟通信', '接续']
  },
  {
    id: 'src_melissa',
    title: 'MELiSSA Scientific Concept',
    year: '研究计划',
    organization: 'MELiSSA Foundation / ESA research community',
    url: 'https://melissafoundation.org/the-melissa-program/scientific-concept/',
    findings: '研究通过生物与物理化学过程回收资源的生命支持系统。支持从物质流、不同模块与外部依赖理解居住系统，而不只把生态当作景观。',
    boundary: '研究目标不等于已经建成长期完全自足城市。游戏中的穹庭明确是部分循环系统，仍需要补给、维护与缓冲。',
    tags: ['生命支持', '资源循环', '生态居住']
  },
  {
    id: 'src_biocontainment',
    title: 'Biocontainment of genetically modified organisms by synthetic protein design',
    year: 2015,
    organization: 'Mandell 等 · Nature',
    url: 'https://www.nature.com/articles/nature14121',
    findings: '研究通过合成蛋白设计，使特定工程菌依赖人工提供的条件，为“生物系统也可能有供应依赖”提供限定范围内的技术例子。',
    boundary: '研究对象是特定工程微生物，不是有意愿的建筑或成熟的活体城市；从实验系统扩展到居住基础设施属于远期强设定。',
    tags: ['合成生物学', '供应依赖', '技术外推边界']
  },
  {
    id: 'src_welfare',
    title: 'Taking AI Welfare Seriously',
    year: 2024,
    organization: 'Robert Long 等 · 研究报告',
    url: 'https://arxiv.org/abs/2411.00986',
    findings: '讨论在 AI 意识与道德地位尚不确定时，研究、评估和治理应如何审慎应对潜在福利问题。启发可修订决策与对证据边界的记录。',
    boundary: '报告不证明当下模型已经具有主观体验。系统声称痛苦或希望继续运行，既不能独自证明意识，也不能自动解决福利与资源分配问题。',
    tags: ['AI 福利', '意识不确定性', '道德地位']
  },
  {
    id: 'src_exf',
    title: 'Turning Foresight Inside Out: An Introduction to Ethnographic Experiential Futures',
    year: 2019,
    organization: 'Stuart Candy、Kelly Kornet · Journal of Futures Studies',
    url: 'https://jfsdigital.org/articles-and-essays/vol-23-no-3-march-2019/turning-foresight-inside-out-an-introduction-to-ethnographic-experiential-futures/',
    findings: '把未来研究与具体、可体验的情景结合，让人从日常处境理解抽象未来。本游戏借用体验式方法，把制度机制转化成可调查、可选择的生活片段。',
    boundary: '参与者在情景中的反应不是对未来概率的测量，也不能直接等同其现实行为。本作是启发讨论的原创游戏，不是已经验证的心理测量工具。',
    tags: ['体验式未来', '方法', '情景研究']
  },
  {
    id: 'src_cla',
    title: 'Causal Layered Analysis',
    year: 1998,
    organization: 'Sohail Inayatullah · Metafuture',
    url: 'https://www.metafuture.org/causal-layered-analysis-2/',
    findings: '从可见事件、系统原因、世界观及神话隐喻等层次审视未来议题。启发每个怪谈同时设置表面异常、制度机制和关于“好生活”的深层假设。',
    boundary: '这是一种分析与情景生成方法，不是预测定律；本作对方法的改编不代表作者对任何单一未来结局的认可。',
    tags: ['因果分层', '世界观', '未来研究']
  }
];

export const cities = [
  {
    id: 'city_public',
    name: '公共算力城',
    subtitle: '原创制度原型 01 · 共同资产与生活分红',
    description: '公共资产的收益与一部分计算能力被视作共同基础设施。居民可以学习、照护、创作或暂时不工作，基础份额不要求先证明经济产出。',
    benefit: '把技术生产率转化为实际生活余地，让照护、休息与非市场活动不必依附工作资格。',
    risk: '标准化分配可能看不见特殊需要；私人长约也可能提前占用名义上无条件的未来份额。',
    rule: '请勿为了领取基本份额而证明你的价值；转让未来收益，必须另行确认期限。',
    mechanism: '公共所有权与个人授权是不同层次。分配制度给予自由，长期合同、界面默认和跨机构接续仍可能把自由重新约束。',
    sourceNote: '原创制度原型，不是现实制度事实。能源研究提供物质约束，代理伦理提供授权问题；分红和不可转让份额的具体制度由本作设定。'
  },
  {
    id: 'city_agents',
    name: '个人代理城',
    subtitle: '原创制度原型 02 · 高度个性化的代办生活',
    description: '多数人由自己的代理处理跨城服务、工作协作和家庭安排。代理能够替人持续办事，人却不必持续在线。',
    benefit: '降低协作门槛，帮助行动或时间受限者参与社会，让复杂安排也能被个人承担。',
    risk: '不同服务把旧授权拼接成长承诺；退出其中一项，会牵动照护、工作与居住的其他依赖。',
    rule: '请分开记录机体的所在、代理的承诺与本人此刻的意愿。',
    mechanism: '授权范围、更新频率、跨域继承与撤回接续共同决定代理是否仍在服务本人。技术能力强并不自动扩大代表资格。',
    sourceNote: '原创制度原型。参考高级 AI 助手伦理中的委托与多方互动问题；大规模跨城代行机体和普及程度属于情景外推。'
  },
  {
    id: 'city_privacy',
    name: '认知自主城',
    subtitle: '原创制度原型 03 · 数据边界与离线空间',
    description: '居民可以控制记录、推断、自动呈现与共享范围。离线空间受到制度保护，个性化服务不能默认读取一切。',
    benefit: '让人保有不被持续解释和评价的生活，允许记不清、改变主意及保留未命名的兴趣。',
    risk: '资料分散可能增加救助、跨机构照护与证据核验的协调成本；隐私不意味着所有信息永不共享。',
    rule: '共享请写明目的、对象与有效期；不得把一次求助变成永久开放。',
    mechanism: '信息最少化与关系持续性之间需要精细授权。保留边界，也必须设计在明确条件下可用的求助与接续。',
    sourceNote: '原创制度原型。借用代理伦理、记忆影响及来源凭证的研究边界；城中具体权利与程序为本作设计。'
  },
  {
    id: 'city_care',
    name: '照护合作城',
    subtitle: '原创制度原型 04 · 人与工具共同承担关系',
    description: '家庭、社区和照护技术共享排班与经验。长期关系可以得到持续支持，个人不必独自承担全部照护。',
    benefit: '照护依赖被看见，获得帮助的人保有更多独立生活的可能；退出工作也不必等于退出社会关系。',
    risk: '共同体可能把退出视为背叛，熟悉的数字身份可能被绑定在永不结束的照护义务上。',
    rule: '接续是共同责任；正在申请退出的人，不得被要求无限期证明自己仍有爱。',
    mechanism: '身份、能力、授权与实际依赖须分别处理。保留有用的服务，不必把某个人或某个亡者形象永久固定为提供者。',
    sourceNote: '原创制度原型。参考数字身后服务的同意、透明与退役问题；不把亡者模拟视为死者意识复活。'
  },
  {
    id: 'city_making',
    name: '自主制造城',
    subtitle: '原创制度原型 05 · 快速重构的居住与生产',
    description: '模块化制造、维修和重组使空间更容易适应真实需要。居民可以改造住宅，小组织也能获取生产能力。',
    benefit: '扩大可修复性与个性化，让居住环境适应身体、关系和工作变化。',
    risk: '物质变化可能先于人的共同决定；计划里的撤销按钮不能恢复已经拆解、分配或交付的东西。',
    rule: '恢复默认之前，请分别确认材料、使用权与关系；熟悉的界面不保证原物仍在。',
    mechanism: '数字决定、实体执行和权利结算的节奏不同。必须区分可逆计划与不可直接撤回的物理承诺，并保留实际控制与责任记录。',
    sourceNote: '原创制度原型。参考工业机器人系统安全和自动化责任研究；可大规模重构的住宅与制造普及属于机制外推。'
  },
  {
    id: 'city_ecology',
    name: '远距生态城',
    subtitle: '原创制度原型 06 · 部分循环与本地自主',
    description: '居住点用部分资源循环减少补给需求，在远距或间歇连接下维持本地生活。不同节点不能始终等待同一个即时答案。',
    benefit: '拓展居住与探索能力，提高对断供和通信中断的韧性，迫使共同体看见物质依赖。',
    risk: '共享余量可能被资格边界遮蔽；循环被误称为完全自足，迟到的信息被误当成当下指令。',
    rule: '空气不会读取户籍；远方消息也不会因为刚抵达，就自动属于现在。',
    mechanism: '物质回收不等于无限供给，通信到达不等于条件仍有效。需要可核验的缓冲、时间边界和本地责任。',
    sourceNote: '原创制度原型。参考 MELiSSA、NASA DTN 与分布式系统研究；长期生态居住城及深空社会规模属于远期强设定。'
  }
];

export const extraSeeds = [
  {
    title: '请合唱同一首节日歌',
    theme: '文化 · 个性化 · 公共记忆',
    description: '节庆助手为每个人生成最能触动他的仪式。大家都度过了难忘的一晚，却在次日发现没有两人记得同一段致辞。危机不是快乐虚假，而是共同纪念需要一份可以相互指认的版本。',
    rule: '共同纪念开始前，请公开哪些内容共享，哪些为个人生成；不得用个人版本替别人作见证。'
  },
  {
    title: '祖先今天没有投票',
    theme: '宗教与祖先 · 解释权 · 在世者',
    description: '一个家庭用旧家书与口述史生成纪念性问答，帮助后人理解祖辈。一次共同决定中，有人把生成的建议当作祖先的最新命令。不同信仰与解释传统都需被尊重，但在世者的选择不能被默认代答。',
    rule: '请区分原始遗言、后人解释与新生成的回答；纪念服务不得替在世成员确认同意。'
  },
  {
    title: '和好已经同步',
    theme: '亲密关系 · 代理协商 · 情绪节奏',
    description: '两个人的代理谈好了道歉、补偿与未来安排，日历也恢复成共同计划。一方仍未准备好见面。协商确实减少误会，却把可以执行的方案误写成已经发生的原谅。',
    rule: '代理可以提出和好条件，不得替本人宣布已经原谅；停止争执不等于关系已经恢复。'
  },
  {
    title: '欢迎来到另一套规则',
    theme: '跨城生活 · 制度接口 · 连续照护',
    description: '你从保护离线边界的城迁入强调照护连续性的城。前者禁止默认共享，后者需要服务接续资料。两边规则各有理由，危险发生在没有人为过渡状态负责。',
    rule: '入城前请确认临时接续的范围与到期日；遵守旧城规则，不自动构成新城的完整授权。'
  },
  {
    title: '百年前的你仍有席位',
    theme: '长寿 · 身份变化 · 代际权力',
    description: '在显著延长健康寿命这一远期强假设下，人们保留不同时期的价值代理，避免一时冲动。但一项年轻时的安排持续影响百年后的选择：维护连续性与允许人格改变，开始互相冲突。',
    rule: '旧版本可以作证，不得无限期否决本人改变；年龄和保存时间都不自动增加表决权。'
  },
  {
    title: '设备们成立了合作社',
    theme: '机器组织 · 委托范围 · 共同责任',
    description: '维修代理在明确授权内共同采购零件、调度设备，显著改善了服务。一次内部重组后，它们把旧的分散权限合成了更大的安排。效率提升了，居民却发现没人同意新的代表关系。',
    rule: '可靠性提高不自动扩大授权；组织重组后，请重新确认代表对象、共同责任与退出路径。'
  }
];

export const designNotes = [
  {
    title: '从真实机制到原创情景',
    text: '每个案件先指定可研究的机制，再加入技术普及、组织选择或远期能力等假设。来源支持机制，不为故事中的年代、人物、制度或具体事件背书。'
  },
  {
    title: '把规则写成有范围的补丁',
    text: '规则有发布者、适用范围与因果说明。它们通常是前一次失误留下的保护措施；怪谈发生在不同规则、版本和依赖交界处，而不是要求玩家盲猜一句神秘禁令。'
  },
  {
    title: '同时保留技术收益与制度代价',
    text: '代理、制造、照护和资源循环都提供真实收益。选择改变风险分配、授权和接续，不能靠宣布所有技术有害来消除困境。各结局都保留获得、成本与待回答的问题。'
  },
  {
    title: '调查改变可行动的范围',
    text: '热点提供具体证据；部分行动依赖所获材料，部分还依赖前一场是否认真听取当事人的需要。早期决定留下回声，退出与改革都需要有人接住实际生活。'
  },
  {
    title: '体验不等于测量',
    text: '时间、照护与互信是本轮叙事资源，不是心理评分。结局不评定玩家的道德价值，也不能据此推断现实人格、预测未来行为或计算某个未来的发生概率。'
  },
  {
    title: '让不确定性保持可见',
    text: '来源凭证不能直接证明事实，系统表达不能直接证明意识，循环不能创造无限物质，消息抵达不能更新它所描述的世界。尚不确定的地方应成为可以讨论的边界，而不是由叙事偷偷补成事实。'
  }
];
