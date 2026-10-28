import React, { useState } from "react";

export function PlantChecklist({ field, value, onChange, disabled }) {
  const catalog = field.catalogue;
  const entries = value?.entries || [];
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState("shrub");
  const [customQuantity, setCustomQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const selected = (id) => entries.find((p) => p.id === id);
  function change(next) {
    onChange({ version: catalog.version, entries: next });
  }
  function toggle(plant, checked) {
    change(
      checked
        ? [...entries, { id: plant.id, quantity: plant.suggested_quantity }]
        : entries.filter((p) => p.id !== plant.id),
    );
  }
  function quantity(id, next) {
    change(entries.map((p) => (p.id === id ? { ...p, quantity: next } : p)));
  }
  function addMix(mix) {
    const additions = catalog.plants.filter(
      (p) => mix.plant_ids.includes(p.id) && !selected(p.id),
    );
    change([
      ...entries,
      ...additions.map((p) => ({ id: p.id, quantity: p.suggested_quantity })),
    ]);
    setMessage(
      `Added ${additions.length} plants from ${mix.label}. Existing quantities kept.`,
    );
  }
  function addCustom() {
    const label = customName.trim();
    const names = entries.map(
      (p) => p.label || catalog.plants.find((x) => x.id === p.id)?.label,
    );
    if (
      !label ||
      names.some(
        (name) => name?.toLocaleLowerCase() === label.toLocaleLowerCase(),
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
    change([
      ...entries,
      {
        id: `custom-${crypto.randomUUID()}`,
        label,
        group: customGroup,
        quantity: customQuantity,
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
        value={p.quantity ?? ""}
        disabled={disabled}
        onChange={(e) =>
          quantity(p.id, e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </label>
  );
  return (
    <div className="plant-checklist">
      {field.legacy_notice && <p className="reason">{field.legacy_notice}</p>}
      <p>
        Choose each plant below, or add a typical mix as a starting point.
        Combine mixes freely and change any quantity. Adding a mix keeps
        existing quantities and avoids duplicates.
      </p>
      <fieldset className="plant-mixes" disabled={disabled}>
        <legend>Typical mix starting points</legend>
        {catalog.mixes.map((mix) => (
          <button key={mix.id} type="button" onClick={() => addMix(mix)}>
            Add {mix.label}
          </button>
        ))}
      </fieldset>
      <p className="muted">
        Plant names and habitat groups follow the library picture. Starting
        quantities and growth forms are illustrative planning assumptions. Exact
        species, site conditions, water needs and provenance need review.
      </p>
      <p role="status" className="plant-message">
        {message}
      </p>
      {catalog.groups.map((group) => (
        <fieldset className="plant-group" key={group.id} disabled={disabled}>
          <legend>{group.label}</legend>
          {catalog.plants
            .filter((p) => p.group === group.id)
            .map((plant) => {
              const entry = selected(plant.id);
              return (
                <div
                  className={`plant-row ${entry ? "plant-selected" : ""}`}
                  key={plant.id}
                >
                  <label className="plant-checkbox">
                    <input
                      type="checkbox"
                      checked={!!entry}
                      onChange={(e) => toggle(plant, e.target.checked)}
                    />
                    <span>{plant.label}</span>
                  </label>
                  {entry && quantityInput(entry, plant.label)}
                  <details className="plant-info">
                    <summary>Details for {plant.label}</summary>
                    <p>
                      {plant.detail}{" "}
                      <a href={plant.source} target="_blank" rel="noreferrer">
                        Reference picture
                      </a>
                    </p>
                  </details>
                </div>
              );
            })}
          {entries
            .filter((p) => p.label && p.group === group.id)
            .map((p) => (
              <div className="plant-row plant-selected" key={p.id}>
                <label className="plant-checkbox">
                  <input
                    type="checkbox"
                    checked
                    onChange={() =>
                      change(entries.filter((x) => x.id !== p.id))
                    }
                  />
                  <span>
                    {p.label} <small>Custom plant</small>
                  </span>
                </label>
                {quantityInput(p, p.label)}
                <small className="plant-info muted">
                  User-defined; identity, water needs and suitability
                  unverified. Uncheck to remove.
                </small>
              </div>
            ))}
        </fieldset>
      ))}
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
              disabled={disabled}
              onChange={(e) => setCustomGroup(e.target.value)}
            >
              {catalog.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
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
        <button type="button" disabled={disabled} onClick={addCustom}>
          Add custom plant
        </button>
      </details>
      <p>
        {entries.length} plant entries selected. Totals and budget are
        calculated by Python in the preview. Shrubs and grasses share the
        current non-tree unit rate.
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
          </tr>
        </thead>
        <tbody>
          {planting.entries.map((p) => (
            <tr key={p.id}>
              <th scope="row">
                {p.label}
                {p.custom ? " · custom" : ""}
              </th>
              <td>{p.quantity}</td>
            </tr>
          ))}
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
