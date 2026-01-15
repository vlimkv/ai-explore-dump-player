# AI Explore — LLM Stream Dump Player (Frontend Test)

Одна страница `AI Explore`, которая проигрывает `.jsonl` дамп SSE-событий и вытаскивает Vega-Lite spec из стриминга.

## Run

```bash
npm i
npm run dev
```

## Input format

Каждая строка файла — одно событие:

```ts
type StreamEvent =
  | { event: "token"; data: { delta: string } }
  | { event: "done"; data: any }
  | { event: "error"; data: { message: string } };
```

## How streaming works (SSE emulation)

- Файл читается как JSONL → массив событий
- При `Play` события проигрываются по очереди с задержкой **50–150ms**
- `token.data.delta` конкатенируется в общий текстовый буфер → показывается в `Streaming output`
- `done` → статус `done`
- `error` → статус `error` + сообщение (UI не падает)

## Vega spec extraction

На каждом новом `token` пытаемся извлечь Vega-Lite JSON из общего текста:

1) Ищем **последний fenced блок** формата:

```json
{ ... }
```

2) Если fenced блока нет — пытаемся найти **последний цельный JSON-объект**:
   - делаем brace matching (баланс `{}`),
   - **игнорируем скобки внутри строк** `"..."`,
   - берём последний завершённый top-level объект.

Далее:
- `JSON.parse` — если ошибка, **это нормально** (спек может быть ещё не дописан)
- Валидация по требованиям: `mark` и `encoding`
- Для рендера подставляем хардкод-данные:

```ts
[
  { region:"Almaty", revenue:120 },
  { region:"Astana", revenue:90 },
  { region:"Shymkent", revenue:70 }
]
```

через `data.values` (даже если LLM принёс другое поле `data`).

## Vega rendering

- Рендер через `vega-embed`
- Ошибки рендера показываем в UI, приложение не падает

## Bonuses included

- Copy Streaming output
- Copy Vega raw spec
- Скорость воспроизведения (0.25x–4x)
- Pause / Resume
- Подсветка JSON (react-syntax-highlighter)

## Repo checklist (для сдачи)

- GitHub repo: этот проект
- Видео: демонстрация Load dump → Play → поток → график → done/error
- README: этот файл
