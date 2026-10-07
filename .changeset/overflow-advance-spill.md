---
"ictus": patch
---

When a second digit would push a day, month, or hour past its max, pad the group and spill the digit into the next one (`3` then `9` → `03.09.|`), including the same idea for time and `mdy` / `ymd`.
