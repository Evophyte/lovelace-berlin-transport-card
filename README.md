# Lovelace card for Berlin (BVG) and Brandenburg (VBB) transport integration

Custom lovelace card that displays upcoming departures from your defined public transport stops for Berlin and Brandenburg.

**The integration itself can be found here: https://github.com/vas3k/home-assistant-berlin-transport**

This card works only after you installed and configured the integration.

![](./docs/screenshots/timetable-card.jpg)

> I use [iOS Dark Mode Theme](https://github.com/basnijholt/lovelace-ios-dark-mode-theme) by @basnijholt, installed from [HACS](https://hacs.xyz/)

## 💿 Installation

This Lovelace card can be installed via [HACS](https://hacs.xyz/) or manually.

> ⚠️ Make sure you installed the [BVG integration](https://github.com/vas3k/home-assistant-berlin-transport) first. This card would not work without it.

### Using HACS

**1.** Open HACS interface from your Home Assistant sidebar

**2.** Add [this repository](https://github.com/vas3k/lovelace-berlin-transport-card) as a custom repository (Three dots in top right corner -> Custom repositories)

**3.** Select "Dashboard" as a category

**4.** Go to `Settings -> Devices & Services -> Add integration` and search for this card name (just type `Berlin`)

**5.** Install it. Now you can add it to your dashboard


### Installing the card manually

**1.** Copy the [berlin-transport-card.js](./dist) card module to the `www` directory of your Home Assistant. The same way you did for the sensor above. If it doesn't exist — create one.

**2.** Go to your Home Assistant dashboard, click "Edit dashboard" at the right top corner and after that in the same top right corner choose "Manage resources".

**3.** Add new resource with URL: `/local/berlin-transport-card.js` and click create. Go back to your dashboard and refresh the page.

**4.** Now you can add the custom card and integrate it with your sensor. Click "Add card -> Manual" or just go to "Raw configuration editor" and use this config.

```yaml
- type: custom:berlin-transport-card
  show_stop_name: true # show or hide the name of your stop in card title
  max_entries: 8 # number of upcoming departures to show (max: 10)
  entities:
    - sensor.stop_id_900110001 # use your entity IDs here
    - sensor.stargarder_str # they might be different from mine
  show_cancelled: true # show or hide the cancelled departures. When not defined or true, the cancelled departures will be shown as struk-through.
  show_delay: true # show or hide the delay if reported. When not defined or true, the delay will be shown next to the departure time.
  show_absolute_time: true # show the absolute time till departure.
  show_relative_time: true # show the relative time till departure.
  include_walking_time: true # subtract walking time to the stop from the relative time to the departure.
  show_warnings: true # show or hide the service warnings if reported. When not defined or true, the warnings will be shown under the direction.
  time_format: "In {min} Min. – {time}{delay_text}" # optional, replaces the time column with your own format, see "Time format" below.
  time_format_now: "Jetzt – {time}" # optional, used instead of time_format when {min} is 0.
```

## 🕒 Time format

By default the right side of each departure shows the relative time, the absolute time and the delay (e.g. `10′ 21:22 +0`). With the optional `time_format` option you can define this text yourself. When it is set, it replaces the whole time column, so `show_relative_time`, `show_absolute_time`, `show_delay` and `include_walking_time` have no effect. Without it, nothing changes.

| Option            | Description                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `time_format`     | Text with placeholders, e.g. `"In {min} Min. – {time}{delay_text}"`.                     |
| `time_format_now` | Optional. Used instead of `time_format` when `{min}` is `0`, e.g. `"Jetzt – {time}"`.    |

| Placeholder    | Description                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `{min}`        | Minutes until the actual departure (including delay), rounded down, never negative.            |
| `{leave}`      | Minutes until you have to leave: `{min}` minus the walking time of the stop, never negative.   |
| `{time}`       | Actual departure time as `HH:MM` (including delay), in the time zone of Home Assistant.        |
| `{planned}`    | Planned departure time as `HH:MM`.                                                             |
| `{delay}`      | Delay in whole minutes (`0` if there is none).                                                 |
| `{delay_text}` | `" (+N)"` if the delay is at least one minute, otherwise an empty string.                      |

Unknown placeholders are left as they are and HTML in the format is escaped. Cancelled departures are still struck through. The card refreshes every minute.

Examples:

```yaml
# "In 15 Min. – 21:22" or, with a delay, "In 18 Min. – 21:25 (+3)"
- type: custom:berlin-transport-card
  entities:
    - sensor.buechnerweg
  time_format: "In {min} Min. – {time}{delay_text}"
  time_format_now: "Jetzt – {time}"

# "21:25 (+3) · Losgehen in 13 Min." (uses the walking time of the stop)
- type: custom:berlin-transport-card
  entities:
    - sensor.s_bahnhof
  time_format: "{time}{delay_text} · Losgehen in {leave} Min."
```


## 🎨 Styling

If you want to change any styles, font size or layout — the easiest way is to use [card_mod](https://github.com/thomasloven/lovelace-card-mod) component. It allows you to change any CSS classes to whatever you want.

## ❤️ Contributions

Contributions are welcome. Feel free to [open a PR](https://github.com/vas3k/lovelace-berlin-transport-card/pulls) and send it to review. If you are unsure, [open an Issue](https://github.com/vas3k/lovelace-berlin-transport-card/issues) and ask for advice.

## 🐛 Bug reports and feature requests

Since this is my small hobby project, I cannot guarantee you a 100% support or any help with configuring your dashboards. I hope for your understanding.

- **If you find a bug** - open [an Issue](https://github.com/vas3k/lovelace-berlin-transport-card/issues) and describe the exact steps to reproduce it. Attach screenshots, copy all logs and other details to help me find the problem.
- **If you're missing a certain feature**, describe it in Issues and try to code it yourself. It's not hard. At the very least, you can try to [bribe me with a PayPal donation](https://www.paypal.com/paypalme/vas3kcom) to make the feature just for you :)

## 👮‍♀️ License

- [MIT](./LICENSE.md)
