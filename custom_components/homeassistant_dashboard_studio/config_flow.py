"""Config flow for Home Assistant Dashboard Studio."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.core import callback

from .const import DOMAIN, PANEL_TITLE

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry, OptionsFlow


class ReactDashboardStudioConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Assistant Dashboard Studio."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Options under Geräte & Dienste → Integration → Optionen."""
        from .options_flow import ReactDashboardStudioOptionsFlowHandler

        return ReactDashboardStudioOptionsFlowHandler(config_entry)

    async def async_step_user(
        self, user_input: dict | None = None
    ) -> ConfigFlowResult:
        """Confirm setup — no credentials required."""
        if self._async_in_progress():
            return self.async_abort(reason="already_in_progress")

        if user_input is not None:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title=PANEL_TITLE, data={})

        return self.async_show_form(step_id="user")
