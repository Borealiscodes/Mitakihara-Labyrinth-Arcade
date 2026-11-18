/**
 * src/arcade-ui.js — Arcade HUD Bars, Score & Roster Updater (Ledger 2)
 * Updates Soul Gem Purity (HP), Hope Energy (Mana), Despair Corruption,
 * Wave counter, and Score cleanly without touching physics state.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { CHARACTER_ROSTER } from "./arcade-entities.js";

export function updateArcadeHud(els, state) {
  const p = state.player;
  const spec = CHARACTER_ROSTER[p.charId] || CHARACTER_ROSTER.madoka;

  if (els.scoreLabel) els.scoreLabel.textContent = `Score: ${state.score}`;
  if (els.waveLabel) els.waveLabel.textContent = `Wave: ${state.wave}`;
  if (els.charLabel) {
    els.charLabel.textContent = `${spec.name}${p.rebellionOverdrive ? " [REBELLION OVERDRIVE]" : ""}`;
  }

  if (els.purityBar) {
    els.purityBar.style.width = `${Math.max(0, Math.min(100, p.purityHp))}%`;
  }
  if (els.purityText) {
    els.purityText.textContent = `${Math.max(0, p.purityHp)} / ${p.maxPurityHp}`;
  }

  if (els.hopeBar) {
    els.hopeBar.style.width = `${Math.max(0, Math.min(100, p.hopeMana))}%`;
  }
  if (els.hopeText) {
    els.hopeText.textContent = `${Math.max(0, p.hopeMana)} / ${p.maxHopeMana}`;
  }

  if (els.despairBar) {
    els.despairBar.style.width = `${Math.max(0, Math.min(100, p.despairCorrupt))}%`;
  }
  if (els.despairText) {
    els.despairText.textContent = `${Math.max(0, p.despairCorrupt)}%`;
  }

  if (els.ultBtn) {
    const ready = p.hopeMana >= 100 && !state.gameOver;
    els.ultBtn.disabled = !ready;
    els.ultBtn.textContent = ready
      ? `UNLEASH: ${spec.ultimateName}`
      : `Ultimate (${p.hopeMana}/100 Hope)`;
  }
}
