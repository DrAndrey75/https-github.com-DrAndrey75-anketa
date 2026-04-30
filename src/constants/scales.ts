import { ScaleDefinition } from '../types';

export const SCALES: ScaleDefinition[] = [
  {
    id: 'VAS',
    title: 'Визуально-аналоговая шкала (ВАШ)',
    description: 'Оценка интенсивности боли на текущий момент.',
    calculateScore: (responses) => responses['pain'] || 0,
    sections: [
      {
        questions: [
          {
            id: 'pain',
            text: 'Оцените уровень вашей боли в плече в среднем за последнюю неделю (0 — нет боли, 10 — невыносимая боль)',
            type: 'slider',
            minLabel: 'Нет боли',
            maxLabel: 'Невыносимая'
          }
        ]
      }
    ]
  },
  {
    id: 'QUICKDASH',
    title: 'QuickDASH',
    description: 'Опросник для оценки нарушений функции руки, плеча и кисти.',
    calculateScore: (responses) => {
      const values = Object.values(responses);
      if (values.length === 0) return 0;
      const sum = values.reduce((a, b) => a + b, 0);
      return Math.round(((sum / values.length) - 1) * 25);
    },
    sections: [
      {
        title: 'За последнюю неделю оцените вашу способность выполнять следующие действия:',
        questions: [
          { id: 'q1', text: 'Открыть тугую или новую банку', type: 'slider', options: [
            { value: 1, label: 'Нет трудностей' }, { value: 2, label: 'Легкие' }, { value: 3, label: 'Средние' }, { value: 4, label: 'Сильные' }, { value: 5, label: 'Невозможно' }
          ]},
          { id: 'q2', text: 'Выполнять тяжелую работу по дому (мыть полы, окна)', type: 'slider', options: [
            { value: 1, label: 'Нет трудностей' }, { value: 2, label: 'Легкие' }, { value: 3, label: 'Средние' }, { value: 4, label: 'Сильные' }, { value: 5, label: 'Невозможно' }
          ]},
          { id: 'q3', text: 'Нести сумку с продуктами', type: 'slider', options: [
            { value: 1, label: 'Нет трудностей' }, { value: 2, label: 'Легкие' }, { value: 3, label: 'Средние' }, { value: 4, label: 'Сильные' }, { value: 5, label: 'Невозможно' }
          ]},
          { id: 'q4', text: 'Помыть спину', type: 'slider', options: [
            { value: 1, label: 'Нет трудностей' }, { value: 2, label: 'Легкие' }, { value: 3, label: 'Средние' }, { value: 4, label: 'Сильные' }, { value: 5, label: 'Невозможно' }
          ]},
          { id: 'q5', text: 'Использовать нож, чтобы резать пищу', type: 'slider', options: [
            { value: 1, label: 'Нет трудностей' }, { value: 2, label: 'Легкие' }, { value: 3, label: 'Средние' }, { value: 4, label: 'Сильные' }, { value: 5, label: 'Невозможно' }
          ]},
          { id: 'q6', text: 'Занятия спортом или хобби, требующие усилий', type: 'slider', options: [
            { value: 1, label: 'Нет трудностей' }, { value: 2, label: 'Легкие' }, { value: 3, label: 'Средние' }, { value: 4, label: 'Сильные' }, { value: 5, label: 'Невозможно' }
          ]},
          { id: 'q7', text: 'Насколько проблемы с рукой мешали вам общаться с людьми?', type: 'slider', options: [
            { value: 1, label: 'Совсем нет' }, { value: 2, label: 'Немного' }, { value: 3, label: 'Умеренно' }, { value: 4, label: 'Сильно' }, { value: 5, label: 'Очень сильно' }
          ]},
          { id: 'q8', text: 'Были ли вы ограничены в работе или другой деятельности?', type: 'slider', options: [
            { value: 1, label: 'Нет' }, { value: 2, label: 'Немного' }, { value: 3, label: 'Средне' }, { value: 4, label: 'Сильно' }, { value: 5, label: 'Невозможно работать' }
          ]},
          { id: 'q9', text: 'Боль в руке, плече или кисти', type: 'slider', options: [
            { value: 1, label: 'Нет' }, { value: 2, label: 'Слабая' }, { value: 3, label: 'Умеренная' }, { value: 4, label: 'Сильная' }, { value: 5, label: 'Невыносимая' }
          ]},
          { id: 'q10', text: 'Покалывание (мурашки) в руке', type: 'slider', options: [
            { value: 1, label: 'Нет' }, { value: 2, label: 'Слабое' }, { value: 3, label: 'Умеренное' }, { value: 4, label: 'Сильное' }, { value: 5, label: 'Очень сильное' }
          ]},
          { id: 'q11', text: 'Трудности со сном из-за боли', type: 'slider', options: [
            { value: 1, label: 'Нет' }, { value: 2, label: 'Небольшие' }, { value: 3, label: 'Средние' }, { value: 4, label: 'Сильные' }, { value: 5, label: 'Постоянная бессонница' }
          ]}
        ]
      }
    ]
  },
  {
    id: 'ASES',
    title: 'ASES (American Shoulder and Elbow Surgeons)',
    description: 'Оценка функции плечевого сустава.',
    calculateScore: (responses) => {
      const pain = responses['pain'] || 0; // 0-10
      const painScore = (10 - pain) * 5; // 0-50
      
      const funcItems = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10'];
      const funcSum = funcItems.reduce((s, id) => s + (responses[id] || 0), 0); // 0-30
      const funcScore = (funcSum * 5) / 3; // 0-50
      
      return Math.round(painScore + funcScore);
    },
    sections: [
      {
        title: 'Боль',
        questions: [
          { id: 'pain', text: 'Оцените вашу боль (0 - нет боли, 10 - максимальная боль)', type: 'slider', minLabel: 'Нет', maxLabel: 'Макс' }
        ]
      },
      {
        title: 'Ежедневная активность (0 — невозможно, 3 — легко)',
        questions: [
          { id: 'f1', text: 'Надеть куртку или пальто', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f2', text: 'Спать на больной стороне', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f3', text: 'Помыть спину / застегнуть бюстгальтер', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f4', text: 'Причесаться', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f5', text: 'Дотянуться до высокой полки', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f6', text: 'Поднять тяжелый предмет (выше уровня плеча)', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f7', text: 'Бросить мяч', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f8', text: 'Вести машину / работать по дому', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f9', text: 'Умыться / побриться', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'},
          { id: 'f10', text: 'Пользоваться столовыми приборами', type: 'slider', options: [{value: 0, label: '0'}, {value: 1, label: '1'}, {value: 2, label: '2'}, {value: 3, label: '3'}], minLabel: 'Невозможно', maxLabel: 'Легко'}
        ]
      }
    ]
  },
  {
    id: 'UCLA',
    title: 'UCLA Shoulder Score',
    description: 'Оценка функции и удовлетворенности пациента.',
    calculateScore: (responses) => {
      return Object.values(responses).reduce((a, b) => a + b, 0);
    },
    sections: [
      {
        questions: [
          { id: 'pain', text: 'Боль', type: 'slider', options: [
            { value: 1, label: 'Постоянная и невыносимая' },
            { value: 2, label: 'Постоянная, сильная' },
            { value: 4, label: 'Умеренная при активности' },
            { value: 6, label: 'Периодическая, легкая' },
            { value: 8, label: 'Редкая, только при сильной нагрузке' },
            { value: 10, label: 'Отсутствует' }
          ]},
          { id: 'func', text: 'Функция', type: 'slider', options: [
            { value: 1, label: 'Не могу пользоваться рукой' },
            { value: 2, label: 'Только легкая активность' },
            { value: 4, label: 'Ограничена повседневная жизнь' },
            { value: 6, label: 'Могу делать почти все' },
            { value: 8, label: 'Ограничена только тяжелая работа' },
            { value: 10, label: 'Нормальная функция' }
          ]},
          { id: 'flexion', text: 'Активное сгибание (в градусах)', type: 'slider', options: [
            { value: 5, label: 'Более 150°' }, { value: 4, label: '120-150°' }, { value: 3, label: '90-120°' }, { value: 2, label: '45-90°' }, { value: 1, label: '30-45°' }, { value: 0, label: 'Менее 30°' }
          ]},
          { id: 'strength', text: 'Сила сгибания', type: 'slider', options: [
            { value: 5, label: 'Нормальная' }, { value: 4, label: 'Хорошая' }, { value: 3, label: 'Удовлетворительная' }, { value: 2, label: 'Слабая' }, { value: 1, label: 'Следы сокращения' }, { value: 0, label: 'Отсутствует' }
          ]},
          { id: 'sat', text: 'Удовлетворенность пациента', type: 'slider', options: [
            { value: 0, label: 'Не удовлетворен' }, { value: 5, label: 'Удовлетворен' }
          ]}
        ]
      }
    ]
  },
  {
    id: 'CONSTANT',
    title: 'Constant–Murley Score',
    description: 'Оценка клинического состояния плечевого сустава.',
    calculateScore: (responses) => {
      return Object.values(responses).reduce((a, b) => a + b, 0);
    },
    sections: [
      {
        title: 'Боль (0-15)',
        questions: [
          { id: 'pain', text: 'Максимальная боль', type: 'slider', options: [
            { value: 0, label: 'Сильная' }, { value: 5, label: 'Умеренная' }, { value: 10, label: 'Слабая' }, { value: 15, label: 'Нет боли' }
          ]}
        ]
      },
      {
        title: 'Активность (0-20)',
        questions: [
          { id: 'sleep', text: 'Сон', type: 'slider', options: [{ value: 0, label: 'Невозможен' }, { value: 1, label: 'Прерывается' }, { value: 2, label: 'Не нарушен' }] },
          { id: 'work', text: 'Работа / повседневная деятельность', type: 'slider', options: [{ value: 0, label: 'Невозможна' }, { value: 1, label: 'Сильные' }, { value: 2, label: 'Умеренные' }, { value: 3, label: 'Легкие' }, { value: 4, label: 'Без ограничений' }] },
          { id: 'sport', text: 'Спорт / хобби', type: 'slider', options: [{ value: 0, label: 'Невозможен' }, { value: 1, label: 'Сильные' }, { value: 2, label: 'Умеренные' }, { value: 3, label: 'Легкие' }, { value: 4, label: 'Без ограничений' }] }
        ]
      }
    ]
  },
  {
    id: 'WORC',
    title: 'WORC Index',
    description: 'Western Ontario Rotator Cuff Index для патологий ротаторной манжеты.',
    calculateScore: (responses) => {
      const sum = Object.values(responses).reduce((a, b) => a + b, 0);
      return Math.round((2100 - (sum * 10)) / 21); // Simplified to 0-100%
    },
    sections: [
      {
        title: 'Физические симптомы (оцените от 0 — нет симптомов, до 10 — невыносимо)',
        questions: [
          { id: 's1', text: 'Боль в плече при движениях над головой', type: 'slider', minLabel: 'Нет', maxLabel: 'Макс' },
          { id: 's2', text: 'Ночная боль в плече', type: 'slider', minLabel: 'Нет', maxLabel: 'Макс' },
          { id: 's3', text: 'Хруст или щелчки в плече', type: 'slider', minLabel: 'Нет', maxLabel: 'Макс' },
          { id: 's4', text: 'Слабость в плече', type: 'slider', minLabel: 'Нет', maxLabel: 'Макс' }
        ]
      }
    ]
  }
];
