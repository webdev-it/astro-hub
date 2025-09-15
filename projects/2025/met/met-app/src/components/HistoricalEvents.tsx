import { useState } from 'react'

type HistoricalEvent = {
  name: string
  year: number
  location: string
  description: string
  scientificDetails: string
  consequences: string[]
  energy: string
  diameter: string
  icon: string
}

const historicalEvents: HistoricalEvent[] = [
  {
    name: "Челябинский метеорит",
    year: 2013,
    location: "Челябинск, Россия",
    description: "15 февраля 2013 года небольшой астероид взорвался в атмосфере над Челябинском, создав одно из самых ярких болидных явлений в современной истории.",
    scientificDetails: "Астероид диаметром ~18 м и массой ~11,000 тонн вошёл в атмосферу под углом ~18° со скоростью ~19 км/с. Взрыв произошёл на высоте ~23 км с энергией ~500 килотонн TNT.",
    consequences: [
      "Повреждение ~7,200 зданий",
      "Травмы у ~1,500 человек (в основном от осколков стекла)",
      "Ударная волна дважды обогнула Землю",
      "Найдено >50 фрагментов общей массой ~654 кг"
    ],
    energy: "~500 килотонн TNT",
    diameter: "~18 метров",
    icon: "🌟"
  },
  {
    name: "Тунгусский метеорит",
    year: 1908,
    location: "Подкаменная Тунгуска, Сибирь",
    description: "30 июня 1908 года произошёл мощный взрыв в атмосфере над рекой Подкаменная Тунгуска, повалив деревья на площади более 2000 км².",
    scientificDetails: "Предположительно комета или астероид диаметром ~60 м взорвался на высоте ~5-10 км с энергией ~15 мегатонн TNT. Кратер не образовался из-за воздушного взрыва.",
    consequences: [
      "Повалено ~80 миллионов деревьев на площади ~2,150 км²",
      "Световые явления наблюдались до Западной Европы",
      "Сейсмические волны зарегистрированы по всему миру",
      "Никто не пострадал из-за малонаселённости региона"
    ],
    energy: "~15 мегатонн TNT",
    diameter: "~60 метров",
    icon: "🌲"
  },
  {
    name: "Чиксулубский астероид",
    year: -66000000,
    location: "Полуостров Юкатан, Мексика",
    description: "66 миллионов лет назад астероид диаметром ~10 км столкнулся с Землёй, образовав кратер Чиксулуб и вызвав массовое вымирание, включая динозавров.",
    scientificDetails: "Астероид массой ~1.3×10¹⁵ кг ударил со скоростью ~25 км/с под углом ~60°, высвободив энергию ~100 миллионов мегатонн TNT и образовав кратер диаметром ~180 км.",
    consequences: [
      "Массовое вымирание 75% видов на Земле",
      "Глобальные лесные пожары",
      "Цунами высотой >100 м",
      "Ядерная зима продолжительностью несколько лет",
      "Конец эпохи динозавров"
    ],
    energy: "~100 миллионов мегатонн TNT",
    diameter: "~10 километров",
    icon: "🦕"
  }
]

type Props = {
  isVisible: boolean
}

export default function HistoricalEvents({ isVisible }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<number>(0)

  if (!isVisible) return null

  return (
    <div style={{ 
      backgroundColor: '#1a1a1a', 
      border: '1px solid #333', 
      borderRadius: '8px', 
      padding: '20px',
      marginTop: '20px'
    }}>
      <h3 style={{ color: '#fff', marginBottom: '20px' }}>📚 Исторические события</h3>
      
      {/* Event Navigation */}
      <div style={{ marginBottom: '20px' }}>
        {historicalEvents.map((event, index) => (
          <button
            key={index}
            onClick={() => setSelectedEvent(index)}
            style={{
              marginRight: '10px',
              marginBottom: '10px',
              padding: '8px 16px',
              backgroundColor: selectedEvent === index ? '#0070f3' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {event.icon} {event.name} ({event.year > 0 ? event.year : '66 млн лет назад'})
          </button>
        ))}
      </div>

      {/* Selected Event Details */}
      <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          
          {/* Event Overview */}
          <div>
            <h4 style={{ color: '#fff', marginBottom: '15px' }}>
              {historicalEvents[selectedEvent].icon} {historicalEvents[selectedEvent].name}
            </h4>
            
            <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '15px' }}>
              <p><strong>Год:</strong> {historicalEvents[selectedEvent].year > 0 ? 
                historicalEvents[selectedEvent].year : '66 миллионов лет назад'}</p>
              <p><strong>Место:</strong> {historicalEvents[selectedEvent].location}</p>
              <p><strong>Диаметр:</strong> {historicalEvents[selectedEvent].diameter}</p>
              <p><strong>Энергия:</strong> {historicalEvents[selectedEvent].energy}</p>
            </div>

            <div style={{ 
              backgroundColor: '#3a3a3a', 
              padding: '15px', 
              borderRadius: '6px',
              borderLeft: '4px solid #0070f3'
            }}>
              <h5 style={{ color: '#fff', marginBottom: '10px' }}>Научные данные</h5>
              <p style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.4' }}>
                {historicalEvents[selectedEvent].scientificDetails}
              </p>
            </div>
          </div>

          {/* Event Description and Consequences */}
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ color: '#fff', marginBottom: '10px' }}>Описание события</h5>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>
                {historicalEvents[selectedEvent].description}
              </p>
            </div>

            <div>
              <h5 style={{ color: '#fff', marginBottom: '10px' }}>Последствия</h5>
              <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5', paddingLeft: '20px' }}>
                {historicalEvents[selectedEvent].consequences.map((consequence, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>{consequence}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Scientific Significance */}
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#1e1e1e', 
          borderRadius: '6px',
          borderLeft: '4px solid #f39c12'
        }}>
          <h5 style={{ color: '#fff', marginBottom: '10px' }}>🔬 Научное значение</h5>
          <p style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.4' }}>
            {selectedEvent === 0 && "Челябинский метеорит стал первым крупным болидным событием в эпоху социальных сетей и мобильных камер, предоставив учёным беспрецедентное количество видеоматериалов для анализа траектории и фрагментации астероида в атмосфере."}
            {selectedEvent === 1 && "Тунгусский феномен остается одним из крупнейших импактных событий в современной истории и важным примером воздушного взрыва астероида, демонстрирующего разрушительную силу даже относительно небольших космических тел."}
            {selectedEvent === 2 && "Чиксулубский импакт является ключевым доказательством катастрофической теории массовых вымираний и показывает, как космические события могут кардинально изменить биосферу Земли, открыв путь для эволюции млекопитающих."}
          </p>
        </div>
      </div>
    </div>
  )
}