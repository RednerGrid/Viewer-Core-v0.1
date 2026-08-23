# Client Delivery Checklist

## Передать клиенту

- core/
- libs/
- modules/
- ui/
- projects/<project-id>/
- app.js
- index.html
- style.css

## Не передавать клиенту

- editor/
- tools/
- docs/
- .git/
- .github/
- .gitattributes
- .gitignore
- package.json
- README.md
- VERSION
- проекты других клиентов

## Проверка перед отправкой

1. Удалить или временно исключить папку editor/.
2. Открыть Viewer без ?dev=1.
3. Проверить стартовую сцену.
4. Проверить переходы между сценами.
5. Проверить panorama, object360, overview и другие используемые модули.
6. Проверить отсутствие ошибок 404 в консоли.
7. Убедиться, что в архиве находится только нужный проект.