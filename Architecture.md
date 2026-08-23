# Viewer Architecture

Version: 1.1

---

# Цель проекта

Viewer — модульная платформа для интерактивной архитектурной визуализации.

Проект строится как долгосрочная система, в которой новая функциональность добавляется без переписывания существующей архитектуры.

Приоритеты проекта:

- модульность;
- независимость компонентов;
- минимальный технический долг;
- простота сопровождения;
- стабильный Runtime.

Главный принцип:

> Архитектура важнее скорости написания кода.

---

# Общая схема

```
Browser

↓

Project Loader

↓

Scene Router

↓

Module Manager

↓

Viewer Module
(Panorama / Object360 / Overview / ...)

↓

UI

↓

Editor Bridge (optional)

↓

Editor

↓

Editor State
```

Editor является расширением Runtime и может полностью отсутствовать.

---

# Runtime

Runtime — публичная часть Viewer.

Он отвечает только за просмотр проекта.

Runtime никогда не содержит логики редактирования.

Основные задачи:

- загрузка проекта;
- переход между сценами;
- отображение модулей;
- управление камерой;
- работа UI.

Runtime должен одинаково работать:

- с Editor;
- без Editor.

---

# Project Loader

Отвечает за загрузку проекта.

Вход:

```
project.json
```

Выход:

```
project
```

Loader ничего не знает о редакторе.

---

# Scene Router

Единственная точка открытия сцены.

Все переходы происходят только через

```js
openScene(project, sceneId)
```

Отвечает за:

- выбор сцены;
- создание Context;
- переключение модулей;
- уничтожение предыдущего Viewer.

Scene Router ничего не знает о реализации модулей.

---

# Module Manager

Определяет, какой Viewer использовать.

Например:

```
Panorama

Object360

Overview
```

Жизненный цикл любого Viewer:

```
init()

↓

work

↓

destroy()
```

Модули полностью независимы друг от друга.

---

# Viewer Modules

Каждый Viewer отвечает только за собственное отображение.

Например:

Panorama Viewer отвечает за:

- сферу;
- камеру;
- hotspot;
- управление пользователем.

## Overview Parallax Viewer

Overview Parallax Viewer — дополнительный режим обзорной сцены.

Он не заменяет существующий статический Overview и используется как отдельный тип сцены:

```text
overviewParallax

Модуль отображает заранее отрендеренную сетку ракурсов объекта и создаёт эффект небольшого орбитального движения камеры.

Основные функции:

загрузка центрального кадра;
предварительная загрузка всей сетки;
управление направлением через движение указателя;
инерция при смене направления;
плавный возврат в центральное положение;
круговое ограничение максимального смещения;
автоматическое определение центра сетки.

Структура сетки задаётся в конфигурации сцены:

{
  "assets": {
    "path": "assets/overview-parallax/",
    "framePrefix": "frame_",
    "extension": "jpg",
    "rows": 13,
    "columns": 13
  }
}

Количество строк и колонок должно быть нечётным, чтобы сетка имела единственный центральный кадр.

Пример структуры ресурсов:

overview-parallax/

    v_p06/
    v_p05/
    ...
    v_p01/
    v_000/
    v_m01/
    ...
    v_m06/

В каждой строке находятся горизонтальные кадры с последовательной нумерацией:

frame_0000.jpg
...
frame_0006.jpg
...
frame_0012.jpg

Центр сетки определяется автоматически:

centerRow = floor(rows / 2)
centerColumn = floor(columns / 2)

Overview Parallax Viewer не содержит Editor-логики и работает как независимый Runtime-модуль.


## В `Roadmap → Реализовано`

Добавь:

```md
✓ Overview Parallax Viewer

✓ Parallax frame preloading

✓ Pointer-driven orbital movement

✓ Circular movement constraint

✓ Spring return and directional inertia

Viewer не занимается:

- экспортом;
- Builder;
- хранением состояния редактора;
- загрузкой проекта.

---

# Runtime ↔ Editor

Связь Runtime и Editor осуществляется только через публичный API.

```
Runtime

↓

Editor Bridge

↓

Editor
```

Взаимодействие происходит через callback'и.

Например:

```
Editor

↓

setView()

↓

Runtime
```

или

```
Runtime

↓

selectHotspot()

↓

Editor
```

Runtime никогда не импортирует внутренние файлы Editor.

---

# Editor

Editor подключается только в режиме разработки.

```
?dev=1
```

Структура:

```
editor/

↓

index.js

↓

editorBridge.js

↓

Developer Tools

↓

Editor State
```

Editor предоставляет Runtime только публичный API.

Например:

- initDeveloperTools()
- selectHotspot()
- saveHotspotPosition()

Внутренние модули Editor скрыты.

---

# Developer Tools

Developer Tools предназначены исключительно для подготовки проекта.

На текущий момент реализовано:

- отображение координат камеры;
- отображение Dirty State;
- Inspector;
- управление названием сцены;
- создание hotspot;
- выбор hotspot;
- изменение Target;
- изменение положения Ctrl + Drag;
- установка стартового вида;
- экспорт сцены.

Developer Tools не входят в клиентскую поставку.

---

# Inspector

Inspector отображает свойства текущего выбранного объекта.

На данный момент существуют два режима:

```
Scene
```

и

```
Hotspot
```

Inspector не отвечает за навигацию.

Список Hotspot является отдельным элементом интерфейса.

Источник состояния Inspector:

```
selectedHotspotId
```

Отдельный режим Inspector не хранится.

---

# Editor State

Во время редактирования каждая сцена получает собственную рабочую копию.

```
scene

↓

editableScenes

↓

Map<sceneId, editableScene>
```

При переключении между сценами изменения не теряются.

Редактирование происходит только через:

```
editableScene
```

Исходные данные проекта не изменяются.

После экспорта создаётся новая версия JSON.

---

# Builder

Builder — отдельный инструмент подготовки проекта.

Не зависит от Runtime.

Основные задачи:

- manifest;
- panorama;
- object360;
- validation;
- build проекта.

Builder не используется клиентом.

---

# Assets

Viewer работает только со ссылками на ресурсы.

Пример структуры:

```
assets/

    panoramas/

    object360/

    overview/

    idpass/
```

Builder автоматически обнаруживает новые ресурсы.

---

# Client Build

Клиент получает только Runtime.

Не входят в поставку:

```
editor/

tools/

docs/
```

Удаление этих папок не должно влиять на работу Viewer.

---

# Git Workflow

Основные ветки:

```
main
```

Стабильная версия.

```
develop
```

Активная разработка.

Правила:

- одна законченная функция = один commit;
- каждая стадия разработки должна оставаться рабочей;
- merge в main только после завершения группы функций.

---

# Принципы разработки

Основные принципы:

1. Простота важнее сложности.
2. Архитектура важнее количества кода.
3. Минимальные изменения предпочтительнее больших рефакторингов.
4. Runtime не зависит от Editor.
5. Editor может использовать Runtime.
6. Один источник истины для каждого состояния.
7. Каждая новая функция должна расширять систему, а не ломать её.

Если задача начинает разрастаться:

- остановиться;
- разбить её на несколько этапов;
- каждый этап должен оставлять проект в рабочем состоянии.

---

# Roadmap

## Реализовано

✓ Panorama Viewer

✓ Object360 Viewer

✓ Overview Viewer

✓ Layer System

✓ Builder

✓ Manifest Generator

✓ Validation

✓ Scene Export

✓ Runtime / Editor Separation

✓ Editor Bridge

✓ Developer Mode

✓ Multi-scene Editor State

✓ Inspector

✓ Hotspot Editor

✓ Ctrl + Drag Hotspot

## Планируется

- Ctrl + Click создание Hotspot
- Undo / Redo
- Overview Editor
- Layer Editor
- Asset Pipeline
- Build Pipeline
- Deployment
- Plugin API
- Overview Parallax Builder validation
- Progressive frame loading for large grids
- Dynamic ID Pass for Overview Parallax

---

# Главный принцип проекта

Viewer — это ядро платформы.

Любая новая функция должна быть реализована так, чтобы через несколько лет её можно было расширить без переписывания существующей архитектуры.

Если решение требует переписать существующую архитектуру, сначала необходимо проверить, можно ли встроить его в существующую систему с минимальными изменениями.