# `styles.css` Quarantine / Holding Area

This file is a safe holding area for CSS snippets retired from `styles.css`
during cleanup work.

Purpose:
- preserve rules that currently look unused
- avoid losing future-state/prototype work accidentally
- keep a lightweight paper trail while we simplify `styles.css`

Conventions:
- snippets are copied here instead of being hard-deleted
- each entry records the removal date, original source area, and reason
- if a snippet is later proven truly unnecessary, it can be removed from this
  file in a later cleanup pass

---

## 2026-06-01 - `.app-header`

Status:
- quarantined, not assumed permanently dead yet

Reason removed from `styles.css`:
- selector was only referenced in `styles.css`
- no matching JS-generated markup, HTML, or template usage was found in repo
- removed from active stylesheet to reduce clutter, but retained here in case it
  belonged to an unfinished/future shell state

Original snippet:

```css
.app-header {
  position: sticky;
  top: 0;
  background: rgba(17, 24, 39, 0.7);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 12px 16px;
}

.app-header h1 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.5px;
}
```

---

## 2026-06-01 - `.runtime-signout-btn`

Status:
- quarantined, not assumed permanently dead yet

Reason removed from `styles.css`:
- selector was only referenced in `styles.css`
- no matching JS-generated markup, HTML, or template usage was found in repo
- likely belonged to an earlier runtime banner/signout treatment that is no longer wired

Original snippet:

```css
.runtime-signout-btn {
  margin-left: var(--space-1);
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.35);
  background: rgba(0,0,0,0.15);
  color: inherit;
  font-size: var(--font-xs);
  cursor: pointer;
}
```

---

## 2026-06-01 - `.appointment-item` family

Status:
- quarantined, not assumed permanently dead yet

Reason removed from `styles.css`:
- selectors were only referenced in `styles.css`
- live appointment-related markup is using the newer `next-apt-*` path instead
- this looked like an older appointments list treatment that is not currently wired

Original snippets:

```css
.appointment-item {
  display: grid;
  grid-template-columns: minmax(60px, 80px) 1fr;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.appointment-item:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
  transform: translateX(2px);
}

.apt-time {
  font-weight: 600;
  color: var(--brand);
  font-size: 14px;
  text-align: center;
}

.apt-details {
  display: grid;
  gap: 4px;
}

.apt-customer {
  font-weight: 600;
  color: var(--text);
  font-size: 14px;
}

.apt-title {
  color: var(--muted);
  font-size: 12px;
}
```

Related responsive override also retired from `styles.css`:

```css
.appointment-item { grid-template-columns: 1fr; gap: var(--space-1); text-align: left; }
.apt-time { text-align: left; }
```

---

## 2026-06-01 - `.menu-grid`

Status:
- quarantined, not assumed permanently dead yet

Reason removed from `styles.css`:
- selector was only referenced in `styles.css`
- no matching JS-generated markup, HTML, or template usage was found in repo
- likely belonged to an earlier home/menu layout iteration that is no longer wired

Original snippet:

```css
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
```

---

## 2026-06-01 - `.input-icon-btn`, `.dropdown`, `.toolbar`

Status:
- quarantined, not assumed permanently dead yet

Reason removed from `styles.css`:
- selectors were only referenced in `styles.css`
- no matching JS-generated markup, HTML, or template usage was found in repo
- likely belonged to older generic utility patterns replaced by more specific modern module controls

Original snippets:

```css
.input-icon-btn {
  font-size: 16px;
  background: rgba(34, 211, 238, 0.15);
  border: 1px solid rgba(34, 211, 238, 0.3);
  color: var(--brand);
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.input-icon-btn:hover {
  background: rgba(34, 211, 238, 0.25);
  border-color: rgba(34, 211, 238, 0.5);
  transform: scale(1.05);
}

.input-icon-btn:active {
  transform: scale(0.95);
  background: rgba(34, 211, 238, 0.35);
}

.dropdown { position: relative; }

.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
```

---

## 2026-06-01 - customer view / rich note / text button leftovers

Status:
- quarantined, not assumed permanently dead yet

Reason removed from `styles.css`:
- selectors were only referenced in `styles.css`
- no matching JS-generated markup, HTML, or template usage was found in repo
- likely belonged to earlier customer/profile/notes presentation states that are no longer wired

Original snippets:

```css
.customer-view-actions-bottom {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.notes-view .rich-note {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 10px;
}

.customer-view .button-compact {
  font-size: 12px !important;
  padding: 6px 10px !important;
}

.text-button {
  transition: color 0.2s ease;
}

.text-button:hover {
  color: var(--brand) !important;
}
```
