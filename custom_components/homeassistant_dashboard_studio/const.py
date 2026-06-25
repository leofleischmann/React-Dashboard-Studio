"""Constants for Home Assistant Dashboard Studio."""

DOMAIN = "homeassistant_dashboard_studio"
PANEL_TAG = "homeassistant-dashboard-studio-panel"
PANEL_URL_PATH = "homeassistant-dashboard-studio"
PANEL_TITLE = "Dashboard Studio"
PANEL_ICON = "mdi:view-dashboard-edit"

# Global dashboard storage (.storage/homeassistant_dashboard_studio).
# WebSocket types must match src/studio/storage.ts and scripts/sync.mjs.
WS_TYPE_GET_PROJECT = f"{DOMAIN}/get_project"
WS_TYPE_SAVE_PROJECT = f"{DOMAIN}/save_project"
WS_TYPE_SUBSCRIBE_PROJECT = f"{DOMAIN}/subscribe_project"
SIGNAL_PROJECT_UPDATED = f"{DOMAIN}_project_updated"

CONF_CONFIRM_RESET = "confirm_reset"
