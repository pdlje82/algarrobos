import React, { useEffect, useId, useState } from "react";
import { properties, required, inputValue, record, unitCost, validUnitCost } from "./contracts.js";
import { checklistSystems, preselectPlants, changeUnitCost, cataloguePricePatch } from "./plantSelection.js";
import { PlantPortrait, plantIllustration } from "./PlantPortrait.jsx";
import { PlantingExplorer } from "./PlantingExplorer.jsx";
import { money } from "./format.js";

export function PlantChecklist({ field, value, onChange, disabled, request }) {
  const checklistId = useId();
  const catalog = field.catalogue;
  properties(value, ["version", "entries"], "plant selection");
  required(
    Array.isArray(value.entries),
    "Plant selection entries must be a list.",
  );
  const entries = value.entries;
  required(value.version === 2 && catalog.selection_version === 2, "This checklist requires per-plant prices. Restart Python and reload.");
  for (const entry of entries) {
    properties(entry, ["unit_cost", "price_confirmed"], "priced plant entry");
    required(typeof entry.price_confirmed === "boolean", "Missing plant price confirmation value.");
  }
  const systems = checklistSystems(catalog);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState(
    catalog.custom_defaults.custom_group,
  );
  const [customQuantity, setCustomQuantity] = useState(
    catalog.custom_defaults.custom_quantity,
  );
  const [message, setMessage] = useState("");
  const [priceDefaults, setPriceDefaults] = useState(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceSaving, setPriceSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [priceMessage, setPriceMessage] = useState("");
  const [reloadPrices, setReloadPrices] = useState(0);
  const [customPrice, setCustomPrice] = useState(catalog.custom_defaults.unit_costs[catalog.custom_defaults.custom_group]);
  const [customPriceEdited, setCustomPriceEdited] = useState(false);
  const defaultsReady = priceDefaults !== null && !priceLoading && loadError === "";
  useEffect(() => {
    let cancelled = false;
    setPriceLoading(true);
    setLoadError("");
    request("plant-prices").then((data) => {
      for (const plant of catalog.plants)
        required(Object.hasOwn(data.unit_costs, plant.id), `Missing default price for ${plant.label}.`);
      if (!cancelled) {
        setPriceDefaults(data);
        setPriceError("");
      }
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message);
    }).finally(() => {
      if (!cancelled) setPriceLoading(false);
    });
    return () => { cancelled = true; };
  }, [request, reloadPrices]);
  useEffect(() => {
    if (priceDefaults !== null && !customPriceEdited)
      setCustomPrice(priceDefaults.custom_unit_costs[customGroup]);
  }, [priceDefaults, customGroup, customPriceEdited]);
  const selected = (id) => entries.find((p) => p.id === id);
  function change(next) {
    onChange({ version: catalog.selection_version, entries: next });
  }
  function toggle(plant, checked) {
    change(
      checked
        ? [...entries, { id: plant.id, quantity: plant.suggested_quantity, unit_cost: priceDefaults.unit_costs[plant.id], price_confirmed: false }]
        : entries.filter((p) => p.id !== plant.id),
    );
  }
  function quantity(id, next) {
    change(entries.map((p) => (p.id === id ? { ...p, quantity: next } : p)));
  }
  function selectSystem(system) {
    required(defaultsReady, "Reload default prices before selecting a system.");
    const next = preselectPlants({ ...catalog, plants: catalog.plants.map((plant) => ({ ...plant, default_unit_cost: priceDefaults.unit_costs[plant.id] })) }, entries, system.id);
    change(next);
    setMessage(
      `${next.length - entries.length} additional plant checkboxes selected for ${system.label}. Edit quantities or uncheck any plant below. Existing quantities kept.`,
    );
  }
  function price(id, next) {
    change(changeUnitCost(entries, id, next));
    setPriceMessage("");
  }
  async function savePrices() {
    setPriceError("");
    setPriceMessage("");
    setPriceSaving(true);
    try {
      required(defaultsReady, "Reload default prices before saving.");
      const patch = cataloguePricePatch(catalog, entries);
      const updated = await request("plant-prices", { expected_revision: priceDefaults.revision, unit_costs: patch });
      setPriceDefaults(updated);
      setPriceMessage(`Default prices saved for ${Object.keys(patch).length} catalogue plants. Existing plans keep their recorded prices. New selections start unconfirmed.`);
    } catch (error) {
      setPriceError(error.message);
    } finally {
      setPriceSaving(false);
    }
  }
  function addCustom() {
    const label = customName.trim();
    const names = entries.map((p) =>
      Object.hasOwn(p, "label")
        ? p.label
        : record(catalog.plants, p.id, "plant").label,
    );
    if (
      !label ||
      names.some(
        (name) => name.toLocaleLowerCase() === label.toLocaleLowerCase(),
      )
    ) {
      setMessage(
        "Enter a new plant name, or edit the quantity of the plant already selected.",
      );
      return;
    }
    if (!Number.isInteger(customQuantity) || customQuantity < 1) {
      setMessage(
        "Enter a positive whole-number quantity for the custom plant.",
      );
      return;
    }
    try { unitCost(customPrice); } catch (error) { setMessage(error.message); return; }
    change([
      ...entries,
      {
        id: `custom-${crypto.randomUUID()}`,
        label,
        group: customGroup,
        quantity: customQuantity,
        unit_cost: customPrice,
        price_confirmed: false,
      },
    ]);
    setCustomName("");
    setMessage(`Added ${label} to the planting list.`);
  }
  const quantityInput = (p, label) => (
    <label className="plant-quantity">
      <span>
        Quantity <span className="sr-only">for {label}</span>
      </span>
      <input
        type="number"
        aria-label={`Quantity for ${label}`}
        min="1"
        max="1000000"
        step="1"
        value={p === undefined ? "" : inputValue(p, "quantity")}
        disabled={disabled || priceSaving || p === undefined}
        onChange={(e) =>
          quantity(p.id, e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </label>
  );
  const priceControls = (entry, plant) => (
    <div className="plant-controls">
      {quantityInput(entry, plant.label)}
      <label className="plant-quantity">
        <span>€/plant</span>
        <input
          type="number" min="0" max="1000000" step="0.01"
          aria-label={`Unit price for ${plant.label}`}
          value={entry === undefined ? (priceDefaults === null ? "" : priceDefaults.unit_costs[plant.id]) : inputValue(entry, "unit_cost")}
          disabled={disabled || priceSaving || entry === undefined}
          onChange={(event) => price(entry.id, event.target.value === "" ? null : Number(event.target.value))}
        />
        <small className="plant-default-price">
          {priceDefaults === null ? "Loading default…" : Object.hasOwn(priceDefaults.unit_costs, plant.id) ? `Default ${money(priceDefaults.unit_costs[plant.id])}` : "Project price"}
        </small>
      </label>
      <label className="plant-price-confirm">
        <input type="checkbox" aria-label={`Price confirmed for ${plant.label}`} aria-describedby="price-confirm-help"
          checked={entry === undefined ? false : entry.price_confirmed}
          disabled={disabled || priceSaving || entry === undefined || !validUnitCost(entry.unit_cost)}
          onChange={(event) => change(entries.map((row) => row.id === entry.id ? { ...row, price_confirmed: event.target.checked } : row))}
        />
        Price confirmed
      </label>
    </div>
  );
  return (
    <div className="plant-checklist">
      {field.legacy_notice && <p className="reason">{field.legacy_notice}</p>}
      <p>
        Use a system preset to check its plants, then adjust the checklist and
        quantities. Combine systems freely. Each plant appears once in your
        quantity cart; presets preserve quantities you have already entered.
      </p>
      <fieldset className="plant-mixes" disabled={disabled || priceSaving || !defaultsReady}>
        <legend>Preselect plants by vegetation system</legend>
        {systems.map((system) => (
          <button
            key={system.id}
            type="button"
            className={system.plant_ids.every((id) => selected(id)) ? "preset-checked" : ""}
            onClick={() => selectSystem(system)}
            aria-label={`Select plants for ${system.label}`}
          >
            <strong>{system.label}</strong>
            <span>{system.plant_ids.every((id) => selected(id)) ? "All plants checked" : "Select plant checkboxes"}</span>
          </button>
        ))}
      </fieldset>
      <p className="muted">
        Plants are grouped by the poster’s systems. Click a whole-plant depiction
        to compare its representative mature form with botanical detail. Each view
        has an original-size option. Open plant details for identification
        references. Quantities and growth forms are planning assumptions.
      </p>
      <p role="status" className="plant-message">
        {message}
      </p>
      <div className="plant-price-defaults">
        <p id="price-confirm-help">Edit €/plant for this draft. Check <strong>Price confirmed</strong> only after checking the amount, for example with a supplier. Changing a price clears its confirmation. Unconfirmed prices remain estimates.</p>
        <p>Save selected catalogue prices as defaults for later selections. Existing plans keep their prices; custom plants stay in this project.</p>
        <div className="plant-default-actions">
          <button type="button" disabled={disabled || priceSaving || !defaultsReady} onClick={savePrices}>
            {priceSaving ? "Saving default prices…" : "Save selected prices as defaults"}
          </button>
          <button type="button" disabled={disabled || priceSaving || priceLoading} onClick={() => setReloadPrices((attempt) => attempt + 1)}>Reload default prices</button>
        </div>
        {priceLoading && <p role="status">Loading current default prices…</p>}
        {loadError && <p className="error" role="alert">{loadError} Your selected plants and prices are retained. Reload default prices to retry.</p>}
        {priceError && <p className="error" role="alert">{priceError}</p>}
        {priceMessage && <p role="status">{priceMessage}</p>}
      </div>
      {systems.map((system) => (
        <fieldset className="plant-group plant-system" key={system.id} disabled={disabled || priceSaving}>
          <legend>{system.label}</legend>
          <p className="plant-system-count muted">
            {system.plants.filter((plant) => selected(plant.id)).length} of {system.plants.length} plants checked
          </p>
          {system.plants.map((plant) => {
              const entry = selected(plant.id);
              const illustration = plantIllustration(plant.id);
              const group = catalog.groups.find((g) => g.id === plant.group);
              required(group !== undefined, `Missing growth form for ${plant.label}.`);
              return (
                <div
                  className={`plant-row ${entry ? "plant-selected" : ""}`}
                  key={plant.id}
                >
                  <div className="plant-identity">
                    <div className="plant-checkbox">
                      <input
                        id={`${checklistId}-${plant.id}`}
                        type="checkbox"
                        aria-label={`Select ${plant.label}`}
                        checked={!!entry}
                        disabled={!entry && !defaultsReady}
                        onChange={(e) => toggle(plant, e.target.checked)}
                      />
                      <PlantPortrait id={plant.id} />
                      <label className="plant-names" htmlFor={`${checklistId}-${plant.id}`}>
                        {plant.label}
                        <small className="plant-spanish" lang="es"><span className="sr-only">Español: </span>{illustration.spanish_name}</small>
                        <small><i>{illustration.scientific_name}</i></small>
                        <small>{group.label}</small>
                      </label>
                    </div>
                    {plant.id === "carob" && <PlantingExplorer />}
                  </div>
                  {priceControls(entry, plant)}
                  <details className="plant-info">
                    <summary>Details for {plant.label}</summary>
                    <p>
                      {illustration.features}
                    </p>
                    <p>{plant.detail}{" "}
                      <a href={plant.source} target="_blank" rel="noreferrer">
                        Vegetation systems poster
                      </a>
                    </p>
                    <ul>
                      {illustration.references.map((reference) => (
                        <li key={reference.url}>
                          <a href={reference.url} target="_blank" rel="noreferrer">{reference.label}</a>
                        </li>
                      ))}
                    </ul>
                    <p>{illustration.habit} Form varies with age, site and management.</p>
                    <small>AI-generated botanical illustrations, checked against the features above. Not to scale.</small>
                    <p><a href={illustration.whole_image} target="_blank" rel="noreferrer">Open whole plant at original size</a>{" · "}<a href={illustration.image} target="_blank" rel="noreferrer">Open botanical detail at original size</a></p>
                  </details>
                </div>
              );
            })}
        </fieldset>
      ))}
      {entries.some((p) => Object.hasOwn(p, "label")) && (
        <fieldset className="plant-group" disabled={disabled}>
          <legend>Your custom plants</legend>
          {entries
            .filter((p) => Object.hasOwn(p, "label"))
            .map((p) => (
              <div className="plant-row plant-selected" key={p.id}>
                <label className="plant-checkbox">
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.label}`}
                    checked
                    onChange={() =>
                      change(entries.filter((x) => x.id !== p.id))
                    }
                  />
                  <span className="plant-custom-portrait" aria-label="No illustration: plant identity not verified">?</span>
                  <span>
                    {p.label} <small>Custom plant</small>
                  </span>
                </label>
                {priceControls(p, p)}
                <small className="plant-info muted">
                  User-defined; identity, water needs and suitability
                  unverified. Uncheck to remove.
                </small>
              </div>
            ))}
        </fieldset>
      )}
      <details className="plant-custom">
        <summary>Add another plant</summary>
        <div className="field-grid">
          <label>
            Plant name
            <input
              maxLength="120"
              value={customName}
              disabled={disabled}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </label>
          <label>
            Growth form
            <select
              value={customGroup}
              disabled={disabled || priceSaving || !defaultsReady}
              onChange={(e) => {
                setCustomGroup(e.target.value);
                setCustomPrice(priceDefaults.custom_unit_costs[e.target.value]);
                setCustomPriceEdited(false);
              }}
            >
              {catalog.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Custom plant unit price (€)
            <input type="number" min="0" max="1000000" step="0.01"
              value={customPrice === null ? "" : customPrice}
              disabled={disabled || priceSaving || !defaultsReady}
              onChange={(event) => {
                setCustomPrice(event.target.value === "" ? null : Number(event.target.value));
                setCustomPriceEdited(true);
              }}
            />
          </label>
          <label>
            Custom plant quantity
            <input
              type="number"
              min="1"
              max="1000000"
              step="1"
              value={customQuantity}
              disabled={disabled}
              onChange={(e) =>
                setCustomQuantity(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </label>
        </div>
        <button type="button" disabled={disabled || priceSaving || !defaultsReady} onClick={addCustom}>
          Add custom plant
        </button>
      </details>
      <p>
        {entries.length} plant entries selected. Totals and budget are
        calculated by Python in the preview using each plant’s unit price.
      </p>
    </div>
  );
}

export function PlantingList({ planting }) {
  if (!planting) return null;
  return (
    <div className="planting-list">
      <table className="demo-budget">
        <caption>Selected planting list</caption>
        <thead>
          <tr>
            <th scope="col">Plant</th>
            <th scope="col">Quantity</th>
            <th scope="col">€/plant</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {planting.entries.map((p) => {
            const identity = p.custom ? null : plantIllustration(p.id);
            return (
            <tr key={p.id}>
              <th scope="row">
                {p.label}
                {p.custom ? " · custom" : ""}
                {identity !== null && (
                  <span className="plant-list-names">
                    <span lang="es">{identity.spanish_name}</span>
                    <i>{identity.scientific_name}</i>
                  </span>
                )}
              </th>
              <td>{p.quantity}</td>
              <td>{money(p.unit_cost)}<small className="price-confirmation-status">{p.price_confirmed === null ? "Not recorded" : p.price_confirmed ? "User-confirmed" : "Estimate"}</small></td>
              <td>{money(p.line_total)}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {planting.questions.length > 0 && (
        <div className="plant-review">
          <strong>Planting questions to review</strong>
          <ul>
            {planting.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
