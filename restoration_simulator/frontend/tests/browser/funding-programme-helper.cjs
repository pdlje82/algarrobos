async function selectProgramme(page,id){
  const search=page.getByRole('searchbox',{name:'Find a programme or approach',exact:true});
  await search.fill(id);
  await page.locator(`.funding-programme-node[data-programme-id="${id}"] .funding-programme-select`).click();
}
module.exports={selectProgramme};
