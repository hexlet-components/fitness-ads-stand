# fitness-ads-stand

[![CI](https://github.com/hexlet-components/fitness-ads-stand/actions/workflows/main.yml/badge.svg)](https://github.com/hexlet-components/fitness-ads-stand/actions/workflows/main.yml)
[![Check](https://github.com/hexlet-components/fitness-ads-stand/actions/workflows/check.yml/badge.svg)](https://github.com/hexlet-components/fitness-ads-stand/actions/workflows/check.yml)

Рекламные площадки вымышленного фитнес-клуба «Пульс» для проекта «Автоматизация воронки лидов» программы «AI-автоматизация» Хекслета. Сайт открыт на <https://hexlet-components.github.io/fitness-ads-stand/>.

Студент собирает сайт клуба с формой записи, ставит на него Яндекс Метрику и Тег Менеджер и принимает заявки в n8n. Рекламы у учебного проекта нет, поэтому переходы студент делает сам с этой страницы. В тёмную полосу сверху он вписывает адрес своего сайта, и объявления на трёх площадках (поиск, соцсеть, канал в мессенджере) ведут на него с разными UTM-метками. Адрес хранится в `localStorage` браузера.

Метки объявлений лежат в [src/links.ts](src/links.ts) и совпадают с шагами проекта. Площадки нарисованы без логотипов и интерфейса настоящих сервисов.

Вторая страница, [manager/](manager/index.html), это рабочее место менеджера. Её отдаёт Caddy на сервере студента рядом с n8n по адресу `https://<адрес машины>/manager/`, поэтому запросы к n8n идут на тот же адрес. Страница опрашивает сценарии студента по контракту из [src/manager-api.ts](src/manager-api.ts): `GET /webhook/leads` отдаёт заявки, `POST /webhook/take` с `{"id": …}` отмечает заявку взятой и отвечает 409 на повторное нажатие, `GET /webhook/report` отдаёт `{"rows": [...]}` с визитами, заявками, взятыми и конверсией по источникам. Новые заявки и напоминания страница показывает уведомлением браузера со звуком.

## Запуск

```sh
mise run setup
mise run dev
```

Сборка `mise run build` кладёт сайт в `dist/`. Пуш в main выкладывает его на GitHub Pages. `make <задача>` вызывает ту же задачу mise.

## Проверки

`mise run check` гоняет тот же набор, что CI: разметку, опечатки, ссылки, workflows, oxfmt, oxlint, tsc, knip и osv-scanner. Тесты сборки ссылок запускает `mise run test`.

---

[![Hexlet Ltd. logo](https://raw.githubusercontent.com/Hexlet/assets/master/images/hexlet_logo128.png)](https://hexlet.io/?utm_source=github&utm_medium=link&utm_campaign=fitness-ads-stand)

This repository is created and maintained by the team and the community of Hexlet, an educational project. [Read more about Hexlet](https://hexlet.io/pages/about?utm_source=github&utm_medium=link&utm_campaign=fitness-ads-stand).
