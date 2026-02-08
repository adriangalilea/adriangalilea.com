---
title: streamlit-shortcuts
publishedAt: 2024-03-15
description: Keyboard shortcuts for Streamlit — now partly native
tags:
  - python
  - open-source
---

[![Downloads](https://pepy.tech/badge/streamlit-shortcuts)](https://pepy.tech/project/streamlit-shortcuts) [![Downloads/month](https://pepy.tech/badge/streamlit-shortcuts/month)](https://pepy.tech/project/streamlit-shortcuts)

Add keyboard shortcuts to any Streamlit widget. Drop-in replacement for `st.button`:

```python
if shortcut_button("Save", "ctrl+s", type="primary"):
    save()
```

Streamlit 1.52+ added native `st.button(shortcut=...)` inspired by this package. The package remains useful for multiple shortcuts per element and shortcuts on non-button widgets — features not yet in native Streamlit.

v1.0 was a complete rewrite: 277 lines down to 91, 15 config files deleted, 5 linters replaced with ruff.

[Live demo](https://shortcuts.streamlit.app/) · [GitHub](https://github.com/adriangalilea/streamlit-shortcuts)
