let get_expr_complexity = (expr: Conjunction[])=> 
    Math.max(expr.length - 1, 0) +
    expr.reduce((v, conjunction)=> v + Math.max(0, conjunction.variables.bits_set_count() * 2 - 1), 0);

let expr_as_string = (expr: Conjunction[])=> 
    expr.map(c => conjuction_as_string(c)).join(" + ");


AppStateMgr.on_state_enter(AppState.Selection, () => {
    by_id("selection").style.display = "flex";
    

    let selected_negative = [] as boolean[];
    let comparators_list  = new ListOfElements(
        by_id("comparators"),
        id => `
        <div class="selection_comparator">
            <div class="column selection_delimiter">
                <input id="comparator_input_l_${id}" type="text" class="selection_input" readonly>
                <div id="comp_strike_l_${id}" class="selection_strike"></div>
            </div>
            <div>
                <div id="complexity_l_${id}" class="complexity" style="border-radius: 10px 0 0 10px;"></div>
                <div id="complexity_r_${id}" class="complexity" style="border-radius: 0 10px 10px 0;"></div>
            </div>
            <div class="column selection_delimiter">
                <input id="comparator_input_r_${id}" type="text" class="selection_input" readonly>
                <div id="comp_strike_r_${id}" class="selection_strike"></div>
            </div>
        </div>
        `,
    );
    let select_item = (index: number, right: boolean)=> {
        selected_negative[index] = right;

        let id = comparators_list.id_of(index);
        by_id(`comp_strike_l_${id}`).style.opacity = right ? "0" : "1";
        by_id(`comp_strike_r_${id}`).style.opacity = right ? "1" : "0";
        by_id(`complexity_l_${id}`).className = right ? "complexity" : "complexity selected_item";
        by_id(`complexity_r_${id}`).className = right ? "complexity selected_item" : "complexity";
    };
    for (let i = 0; i < state.y_count; i++) {
        let expr_l = state.minimizing.find(x => x.y_index === i && !x.negative)!.choosing;
        let expr_r = state.minimizing.find(x => x.y_index === i &&  x.negative)!.choosing;

        comparators_list.append();

        let id = comparators_list.id_of(i);
        by_id(`complexity_l_${id}`).onclick = ()=> select_item(i, false);
        by_id(`complexity_r_${id}`).onclick = ()=> select_item(i, true);

        let l_complex = get_expr_complexity(expr_l);
        let r_complex = get_expr_complexity(expr_r);
        by_id(`complexity_l_${id}`).textContent = `<< Сложность: ${l_complex}`;
        by_id(`complexity_r_${id}`).textContent = `Сложность: ${r_complex} >>`;

        //выбираем по умолчанию наименьшую сложность
        select_item(i, r_complex < l_complex);

        let l_str = expr_as_string(expr_l);
        if (l_str.length === 0)
            l_str = "0";
        let r_str = expr_as_string(expr_r);
        if (r_str.length === 0)
            r_str = "0";
        (by_id(`comparator_input_l_${id}`) as HTMLInputElement).value = `Y${i + 1} = ` + l_str;
        (by_id(`comparator_input_r_${id}`) as HTMLInputElement).value = `!Y${i + 1} = ` + r_str;
    }

    by_id("selection_next").onclick = ()=> {
        for (let y = 0; y < state.y_count; y++) {
            state.selection.push({
                y_index  : y,
                negative : selected_negative[y],
            });
        }
        AppStateMgr.go_to_state(AppState.Editing);
    };
})
AppStateMgr.on_state_exit(AppState.Selection, ()=> {
    by_id("selection").style.display = "none";
});
