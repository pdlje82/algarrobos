"""Stage current API plans through the same explicit handoff as the browser."""
from uuid import uuid4
from backend import designer


def stage_plan(client, values):
    data=client.get("/api/project").json();w=client.get("/api/designer").json()
    d=w["evaluation"]["draft"]
    physical={k:v for k,v in values.items() if k in designer.PHYSICAL and k!="plant_selection"}
    d=designer.evaluate(d,data["project"],dict(kind="patch",section="physical",values=physical))["draft"]
    for row in values["plant_selection"]["entries"]:
        d=designer.evaluate(d,data["project"],dict(kind="plant",id=row["id"],enabled=True))["draft"]
        d=designer.evaluate(d,data["project"],dict(kind="density",id=row["id"],value=row["quantity"]*10000/values["restoration_area"]))["draft"]
    d=designer.evaluate(d,data["project"],dict(kind="selection",selection=values["plant_selection"]))["draft"]
    r=client.post("/api/designer/save",json=dict(revision=data["revision"],design_revision=w["design_revision"],request_id=str(uuid4()),draft=d,mode="create",design_id=None,name="API plan"))
    assert r.status_code==200,r.text
    p=data["planning"]
    r=client.post("/api/designer/handoff",json=dict(revision=data["revision"],design_revision=r.json()["design_revision"],planning_revision=p["planning_revision"],request_id=str(uuid4())))
    assert r.status_code==200,r.text
    r=client.post("/api/demonstrator/draft",json=dict(revision=data["revision"],planning_revision=r.json()["planning_revision"],request_id=str(uuid4()),administration={k:v for k,v in values.items() if k not in designer.PHYSICAL}))
    assert r.status_code==200,r.text
    return r.json()
