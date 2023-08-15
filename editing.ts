let colors  = [
    "rgba(255, 26,  11,  alpha)",
    "rgba(17,  178, 220, alpha)",
    "rgba(247, 177, 0,   alpha)",
    "rgba(35,  62,  253, alpha)",
    "rgba(184, 238, 3,   alpha)",
    "rgba(163, 4,   255, alpha)",
    "rgba(84,  247, 71,  alpha)",
    "rgba(241, 0,   255, alpha)",
];
let col_idx = 0;
let next_color = (alpha = 0.3)=> {
    if (col_idx >= colors.length)
        col_idx = 0;
    return colors[col_idx++].replace("alpha", alpha.toString());
}


let equal_dusjunctions = (a: Conjunction[], b: Conjunction[])=> {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (!equal_conjunctions(a[i], b[i]))
            return false;
    return true;
}

let parse_expr = (str: string)=> {
    str = str
        .replaceAll(/\s/g,'')   // проще для обработки
        .replaceAll("*", "")    // x1 * x2 -> x1 x2
        .replaceAll("&", "")    // x1 & x2 -> x1 x2
        .replaceAll("^", "!")   // ^x2 -> !x2
        .replaceAll("-", "!")   // -x2 -> !x2
        .replaceAll("~", "!")   // ~x2 -> !x2
        .replaceAll("х", "x")   // символы кириллицы
        .replaceAll("Х", "x")   // символы кириллицы
        .replaceAll("у", "y")   // символы кириллицы
        .replaceAll("У", "y")   // символы кириллицы
        .replaceAll("X", "x")   // разный регистр
        .replaceAll("Y", "y")   // разный регистр
        .replaceAll("|", "+")   // x1 | x2 -> x1 + x2
    
    let pos = 0;
    let neg = str[pos] === "!";
    if (neg)
        pos++;
    if (str[pos++] !== "y")
        return null;
    if (str[pos] < '0' || str[pos] > '9')
        return null;
    let idx = Number.parseInt(str[pos++]) - 1;
    if (idx < 0 || isNaN(idx))
        return null;
    if (str[pos++] !== "=")
        return null;

    let parts = str.substring(pos).split("+");
    let conjs = [] as Conjunction[];

    if (parts.length !== 1 || parts[0] !== "0")
    for (let prt of parts) {
        if (prt.length === 0)
            return null;
        
        let con = { variables : new BitField(0), negative : new BitField(0) };
        let pos = 0;
        while (pos < prt.length) {
            let neg = prt[pos] === "!";
            if (neg)
                pos++;
            if (prt[pos++] !== "x")
                return null;
            if (prt[pos] < '0' || prt[pos] > '9')
                return null;
            let idx = Number.parseInt(prt[pos++]) - 1;
            if (idx < 0 || isNaN(idx))
                return null;
            con.variables.set_bit_at(idx, true);
            con.negative.set_bit_at(idx, neg);
        }
        conjs.push(con);
    }

    return {
        expr     : conjs,
        y_index  : idx,
        negative : neg, 
    } as YExpression;
}

AppStateMgr.on_state_enter(AppState.Editing, ()=> {
    by_id("editing").style.display = "flex";

    let editing_talbe = by_id("editing_initial");
    for (let i = 0; i < state.y_count; i++) {
        editing_talbe.innerHTML += `<div class="editing_input" tabindex="0" contenteditable></div>`;
    }

    let initial_exprs : YExpression[] = state.minimizing
        .filter(x => state.selection.find(s => s.y_index === x.y_index && s.negative === x.negative))
        .sort((a, b)=> a.y_index - b.y_index)
        .map(x => ({ 
            y_index  : x.y_index,
            negative : x.negative,
            expr     : x.choosing,
        }));
    let parsed_exprs  = [] as YExpression[];

    let reset = ()=> {
        for (let i = 0; i < state.y_count; i++) {
            let init  = initial_exprs[i];
            let child = editing_talbe.children[i] as HTMLElement;
            child.textContent = state.minimizing_skip ? 
            `Y${i + 1} = 0` : 
            `${init.negative ? "!" : " "}Y${init.y_index + 1} = ${expr_as_string(init.expr)}`;
            child.oninput = ()=> { 
                was_changes = true;
                need_apply  = true;
            };
        }
    };

    let update = ()=> {
        parsed_exprs = [];
        
        if (state.minimizing_skip) {
            for (let index = 0; index < state.y_count; index++) {
                let child       = editing_talbe.children[index];
                let parsed_expr = parse_expr(child.textContent ?? "");
                if (parsed_expr && parsed_expr.y_index === index) {
                    child.className = "editing_input";
                    parsed_exprs.push(parsed_expr);
                }
                else child.className = "editing_input wrong";
            }
            return;
        }

        [...editing_talbe.children].forEach((child, index)=> {
            let parsed_expr = parse_expr(child.textContent ?? "");
            if (parsed_expr && parsed_expr.y_index === index) {
                if (
                    parsed_expr.negative === initial_exprs[index].negative &&
                    equal_dusjunctions(parsed_expr.expr, initial_exprs[index].expr)
                )
                    child.className = "editing_input"
                else
                    child.className = "editing_input changed";
                parsed_exprs.push(parsed_expr);
            }
            else {
                child.className = "editing_input wrong";
            }
        });
    };

    let k_values = [] as KValue[];
    let y_values = [] as YValue[];
    let apply = ()=> {
        need_apply = false;

        if (parsed_exprs.length !== state.y_count) {
            add_class_for(by_id("apply_edit"), "wrong", 500);
            return;
        }

        k_values = [];
        for (let res of parsed_exprs)
        for (let con of res.expr) {
            let k_value = k_values.find(x => equal_conjunctions(x.value, con));
            if (k_value && k_value.color === "transparent") {
                k_value.color = next_color();
            }
            if (!k_value) {
                k_values.push({ value: con, color: "transparent" });
            }
        }

        y_values = [];
        for (let expr of parsed_exprs) {
            y_values.push({
                k_indices : [],
                ...expr
            });
            for (let con of expr.expr) {
                y_values[y_values.length - 1].k_indices.push(
                    k_values.findIndex(x => equal_conjunctions(x.value, con))
                );
            }
        }

        let k_html = [] as string[];
        k_values.forEach((k, i) => {
            k_html.push(`K${i + 1} <b>=</b> <mark style="background-color: ${k.color}">${conjuction_as_string(k.value)}</mark>`);
        });
        by_id("k_values").innerHTML = k_html.join("<br>");

        let y_html   = [] as string[];
        for (let y_value of y_values) {
            let k_html = [] as string[];
            if (y_value.k_indices.length === 0)
                k_html.push("0");
            for (let k_index of y_value.k_indices) {
                k_html.push(`<mark style="background-color: ${k_values[k_index].color}">K${k_index + 1}</mark>`);
            }
            y_html.push(`${y_value.negative ? "!" : "&#32;"}Y${y_value.y_index + 1} <b>=</b> ` + k_html.join("&#32;<b>+</b>&#32;"));
        }
        by_id("y_values").innerHTML = y_html.join("<br>");

        [...editing_talbe.children].forEach((child, index)=> {
            let expr   = parsed_exprs[index];
            let r_html = [] as string[];
            if (expr.expr.length === 0) 
                r_html.push("0");
            for (let con of expr.expr) {
                let k = k_values.find(x => equal_conjunctions(x.value, con))!;
                r_html.push(`<mark style="background-color: ${k.color}">${conjuction_as_string(k.value)}</mark>`);
            }
            child.innerHTML = `${expr.negative ? "!" : "&#32;"}Y${expr.y_index + 1}&#32;<b>=</b>&#32;${r_html.join("&#32;<b>+</b>&#32;")}`;
        });
    }

    let was_changes     = false;
    let need_apply      = false;
    let update_interval = setInterval(()=> {
        if (AppStateMgr.current_state === AppState.Editing) {
            if (was_changes) {
                was_changes = false;
                update();
            }
        }
        else clearInterval(update_interval);
    }, 500);

    by_id("apply_edit").onclick = ()=> {
        update();
        apply();
    }
    by_id("reset_edit").onclick = ()=> {
        reset();
        update();
        apply();
    }
    by_id("editing_next").onclick = (e)=> {
        if (was_changes || need_apply) {
            add_class_for(e.target as Element, "wrong", 500);
            return;
        }
        state.k_values     = k_values;
        state.y_values     = y_values;
        state.final_values = parsed_exprs;
        AppStateMgr.go_to_state(AppState.Results);
    }

    reset();
    update();
    apply(); 
});
AppStateMgr.on_state_exit(AppState.Editing, ()=> {
    by_id("editing").style.display = "none";
});