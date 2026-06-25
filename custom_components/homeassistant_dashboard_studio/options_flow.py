"""Options flow — reset saved dashboard to the bundled default."""

from __future__ import annotations

from typing import Any

import voluptuous as vol  # pyright: ignore[reportMissingImports]

from homeassistant import data_entry_flow  # pyright: ignore[reportMissingImports]
from homeassistant.config_entries import OptionsFlow  # pyright: ignore[reportMissingImports]
from homeassistant.helpers import config_validation as cv  # pyright: ignore[reportMissingImports]

from .const import CONF_CONFIRM_RESET
from .user_data import async_reset_dashboard_project


class ReactDashboardStudioOptionsFlowHandler(OptionsFlow):
    """Integration options — restore bundled default dashboard."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        """Confirm and reset the global dashboard project."""
        if user_input is not None:
            if not user_input.get(CONF_CONFIRM_RESET):
                return self.async_show_form(
                    step_id="init",
                    data_schema=self._schema(),
                    errors={"base": "not_confirmed"},
                )

            await async_reset_dashboard_project(self.hass)
            return self.async_create_entry(title="", data={"reset": True})

        return self.async_show_form(step_id="init", data_schema=self._schema())

    @staticmethod
    def _schema() -> vol.Schema:
        return vol.Schema(
            {
                vol.Required(CONF_CONFIRM_RESET, default=False): cv.boolean,
            }
        )
