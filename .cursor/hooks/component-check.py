"""
Cursor beforeReadFile hook: component-check.py

When the agent accesses a component file that does NOT yet exist inside
src/components/, this hook fuzzy-searches the existing component tree for
semantically similar names. If a match is found the agent is warned to
evaluate reuse before creating a new file.

Stdin:  JSON  {"path": "<file-path>"}
Stdout: JSON  {"continue": true, ...}  (with optional user_message / agent_message)
"""

import json
import os
import re
import sys
from difflib import SequenceMatcher

# ---------------------------------------------------------------------------
# Semantic synonym groups – components that serve the same UI purpose
# ---------------------------------------------------------------------------
SEMANTIC_GROUPS: dict[str, list[str]] = {
    "dialog": [
        "modal", "dialog", "alertdialog", "confirm", "confirmdialog",
        "confirmmodal", "prompt", "popup", "overlay", "lightbox",
    ],
    "drawer": [
        "drawer", "sheet", "slideover", "slideout", "sidepanel",
    ],
    "input": [
        "input", "textfield", "textbox", "field", "textinput", "textarea",
    ],
    "select": [
        "select", "dropdown", "combobox", "picker", "autocomplete",
        "typeahead", "multiselect", "autocompleteinput",
    ],
    "button": [
        "button", "btn", "iconbutton", "submitbutton", "actionbutton",
    ],
    "table": [
        "table", "datagrid", "datatable", "grid", "virtualizedlist",
    ],
    "card": [
        "card", "tile", "panel", "surface",
    ],
    "navigation": [
        "nav", "navbar", "sidebar", "menu", "menubar", "toolbar",
        "appbar", "topbar", "bottomnav", "navigationmenu", "appsidebar",
    ],
    "tabs": [
        "tabs", "tab", "tabpanel", "tablist", "segmented",
    ],
    "toast": [
        "toast", "toaster", "snackbar", "sonner",
    ],
    "notification": [
        "notification", "notificationbell", "notificationcenter",
        "alert", "flash", "banner",
    ],
    "tooltip": [
        "tooltip", "popover", "hovercard", "infotip",
    ],
    "form": [
        "form", "formfield", "fieldset", "formgroup",
    ],
    "badge": [
        "badge", "chip", "tag", "pill",
    ],
    "progress": [
        "progress", "loading", "spinner", "skeleton", "loader",
        "indicator", "segmentedprogress",
    ],
    "breadcrumb": [
        "breadcrumb", "stepper", "wizard", "steps",
    ],
    "accordion": [
        "accordion", "collapsible", "expandable", "disclosure", "details",
    ],
    "carousel": [
        "carousel", "slider", "gallery", "slideshow", "swiper",
    ],
    "avatar": [
        "avatar", "profileimage", "userpic",
    ],
    "toggle": [
        "checkbox", "switch", "toggle", "togglegroup", "radio", "radiogroup",
    ],
    "pagination": [
        "pagination", "pager", "paginator",
    ],
    "emptystate": [
        "empty", "emptystate", "placeholder", "nodata", "zeroresult",
    ],
    "error": [
        "error", "errorboundary", "errorpage", "notfound", "fallback",
    ],
    "separator": [
        "separator", "divider",
    ],
    "scroll": [
        "scroll", "scrollarea", "scrollbar",
    ],
    "calendar": [
        "calendar", "datepicker", "datetimepicker", "daterange",
    ],
    "image": [
        "image", "imagegallery", "imageupload", "photo", "thumbnail",
        "picture", "imageuploadwithnote",
    ],
    "header": [
        "header", "pageheader", "sectionheader",
    ],
    "chart": [
        "chart", "graph", "visualization", "plot",
    ],
    "otp": [
        "otp", "inputotp", "pincode", "verificationcode",
    ],
    "command": [
        "command", "commandpalette", "spotlight", "commandmenu",
    ],
    "resizable": [
        "resizable", "splitpane", "splitter",
    ],
    "contextmenu": [
        "contextmenu", "rightclick", "popupmenu",
    ],
    "label": [
        "label", "formlabel", "fieldlabel",
    ],
    "logo": [
        "logo", "brandmark", "logotype",
    ],
    "savestatus": [
        "savestatus", "autosave", "autosaveindicator", "savestatusindicator",
    ],
}

# Match threshold – lower = more aggressive warnings
FUZZY_THRESHOLD = 0.55


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize_name(filename: str) -> str:
    """Lowercase, strip extension, remove hyphens/underscores."""
    name = re.sub(r"\.(tsx?|jsx?|vue|svelte)$", "", filename)
    name = name.lower()
    # Drop common hook / HOC prefixes so "useDialog" matches "dialog"
    name = re.sub(r"^(use[-_]?|with[-_]?)", "", name)
    # Collapse separators
    name = re.sub(r"[-_.]", "", name)
    return name


def get_semantic_groups(normalized: str) -> set[str]:
    """Return every semantic-group tag that overlaps with *normalized*."""
    groups: set[str] = set()
    for group, keywords in SEMANTIC_GROUPS.items():
        for kw in keywords:
            if kw in normalized or normalized in kw:
                groups.add(group)
    return groups


def collect_components(components_dir: str) -> list[dict]:
    """Walk src/components and return metadata for every component file."""
    components: list[dict] = []
    if not os.path.isdir(components_dir):
        return components

    for root, dirs, files in os.walk(components_dir):
        # Skip test / build artefact dirs
        dirs[:] = [
            d for d in dirs
            if d not in ("__tests__", "node_modules", ".git", "dist", "build")
        ]
        for fname in files:
            if not re.search(r"\.(tsx?|jsx?)$", fname):
                continue
            if re.search(r"\.(test|spec)\.", fname):
                continue
            rel = os.path.relpath(os.path.join(root, fname), components_dir)
            components.append(
                {
                    "name": fname,
                    "rel_path": rel.replace("\\", "/"),
                    "normalized": normalize_name(fname),
                }
            )
    return components


def fuzzy_score(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def find_similar(
    target: str,
    existing: list[dict],
    threshold: float = FUZZY_THRESHOLD,
) -> list[dict]:
    """Return up to 5 existing components ranked by similarity to *target*."""
    target_norm = normalize_name(target)
    target_groups = get_semantic_groups(target_norm)

    scored: list[dict] = []
    for comp in existing:
        score = fuzzy_score(target_norm, comp["normalized"])

        # Semantic-group boost
        comp_groups = get_semantic_groups(comp["normalized"])
        overlap = target_groups & comp_groups
        if overlap:
            score = max(score, 0.60)
            score += 0.15 * len(overlap)

        # Substring containment boost
        if target_norm in comp["normalized"] or comp["normalized"] in target_norm:
            score = max(score, 0.70)

        if score >= threshold:
            scored.append(
                {
                    "name": comp["name"],
                    "path": comp["rel_path"],
                    "score": round(min(score, 1.0), 2),
                    "groups": sorted(overlap) if overlap else [],
                }
            )

    scored.sort(key=lambda m: m["score"], reverse=True)
    return scored[:5]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    # ---- parse stdin --------------------------------------------------------
    try:
        data = json.loads(sys.stdin.read())
        file_path: str = data.get("path", "")
    except (json.JSONDecodeError, KeyError):
        _allow()
        return

    # ---- normalise path separators ------------------------------------------
    file_path = file_path.replace("\\", "/")

    # ---- only care about src/components/ ------------------------------------
    if "src/components/" not in file_path:
        _allow()
        return

    # ---- resolve project root -----------------------------------------------
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))

    abs_path = (
        file_path
        if os.path.isabs(file_path)
        else os.path.join(project_root, file_path)
    )

    # ---- file already exists → nothing to warn about ------------------------
    if os.path.exists(abs_path):
        _allow()
        return

    # ---- skip index / barrel / test files -----------------------------------
    basename = os.path.basename(file_path)
    if basename in ("index.ts", "index.tsx", "index.js", "index.jsx"):
        _allow()
        return
    if re.search(r"\.(test|spec)\.", basename):
        _allow()
        return

    # ---- fuzzy search -------------------------------------------------------
    components_dir = os.path.join(project_root, "src", "components")
    existing = collect_components(components_dir)
    matches = find_similar(basename, existing)

    if not matches:
        _allow()
        return

    # ---- build warning ------------------------------------------------------
    top = matches[0]
    match_list = ", ".join(
        f"'{m['name']}' (src/components/{m['path']}, score={m['score']})"
        for m in matches[:3]
    )

    response = {
        "continue": True,
        "user_message": (
            f"Component similarity detected: '{basename}' may overlap with "
            f"existing component(s): {match_list}."
        ),
        "agent_message": (
            f"Stop. A component named '{top['name']}' already exists at "
            f"src/components/{top['path']}. "
            f"Evaluate if it can be reused or extended before creating a new "
            f"file '{basename}'. "
            f"Similar components found: {match_list}. "
            f"Only proceed with a new file if the existing components genuinely "
            f"cannot serve this purpose."
        ),
    }
    print(json.dumps(response))
    sys.exit(0)


def _allow() -> None:
    """Emit the default 'continue' response and exit."""
    print(json.dumps({"continue": True}))
    sys.exit(0)


if __name__ == "__main__":
    main()
