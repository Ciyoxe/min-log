
/** Получить число из поля ввода по id с ограничением [min, max] */
let value_from_element_clamped = (elem_id: string, min: number, max: number)=> {
    let element = by_id(elem_id) as HTMLInputElement;
    let value   = Number.parseInt(element.value);
    if (value < min) {
        add_class_for(element, "wrong", 500);
        element.value = min.toString();
        value = min;
    }
    if (value > max) {
        add_class_for(element, "wrong", 500);
        element.value = max.toString();
        value = max;
    }
    return value;
}

AppStateMgr.on_state_enter(AppState.Input, ()=> {
    by_id("input").style.display = "flex";
    
    let input_list = new ListOfElements(
        by_id("input_table"), 
        id => `
        <div class="input_value" id="input_value_${id}">
            X: &nbsp; <input type="text" id="input_x_${id}"> &nbsp;
            Y: &nbsp; <input type="text" id="input_y_${id}"> &nbsp;
            <button id="input_del_value_${id}" class="del_value red_btn" tabindex="-1">X</button>
        </div>`,
        id => by_id(`input_del_value_${id}`).onclick = ()=> {
            input_list.remove_id(id);
        }
    );
    by_id("x_count_input").onchange = ()=> {
        state.x_count = value_from_element_clamped("x_count_input", 1, 6);
    };
    by_id("y_count_input").onchange = ()=> {
        state.y_count = value_from_element_clamped("y_count_input", 1, 8);
    };
    by_id("add_value_button").onclick = ()=> {
        input_list.append();
    }
    by_id("input_next").onclick = ()=> {
        let is_hex = (by_id("is_hex_input") as HTMLInputElement).checked;
        let inputs = [];
        // считываем значения X и Y из полей ввода
        for (let i = 0; i < input_list.length; i++) {
            let id = input_list.id_of(i);
            let x  = Number.parseInt((by_id(`input_x_${id}`) as HTMLInputElement).value, is_hex ? 16 : 2);
            let y  = Number.parseInt((by_id(`input_y_${id}`) as HTMLInputElement).value, is_hex ? 16 : 2);
            // при ошибке добавляем красное свечение кнопке Далее и полю ввода на полсекунды
            if (isNaN(x) || isNaN(y)) {
                add_class_for(by_id(`input_value_${id}`), "wrong", 500);
                add_class_for(by_id(`input_next`), "wrong", 500);
                return;
            }
            inputs.push({
                x: new BitField(x),
                y: new BitField(y),
            });
        }
        state.input_values = inputs;
        AppStateMgr.go_to_state(AppState.Minimizing);
    };
});
AppStateMgr.on_state_exit(AppState.Input, ()=> {
    by_id("input").style.display = "none";
});