
enum AppState {
    // ввод сигналов
    Input,
    // таблицы минимизации
    Minimizing,
    // выбор выражений
    Selection,
    // редактирование данных, вывод K
    Editing,
    // результаты и таблицы плм
    Results,
}
let AppStateMgr = {
    current_state : null as AppState | null,

    state_enter_handlers : new Map<AppState, Function>,
    state_exit_handlers  : new Map<AppState, Function>,

    on_state_enter(state: AppState, fn: Function) {
        this.state_enter_handlers.set(state, fn);
    },
    on_state_exit(state: AppState, fn: Function) {
        this.state_exit_handlers.set(state, fn);
    },
    go_to_state(state: AppState) {
        if (this.current_state != null) {
            let ext_hd = this.state_exit_handlers.get(this.current_state);
            if (ext_hd) ext_hd();
        }
        this.current_state = state;
        let ent_hd = this.state_enter_handlers.get(state);
        if (ent_hd) ent_hd();
    }
}

// Исходные X и Y
type InputPair = {
    x : BitField,
    y : BitField,
};
// выражение типа X1 * !X2 * X3 * ...
type Conjunction = {
    variables : BitField,
    negative  : BitField,
};
// результат минимизации одной таблицы
type Minimizing = {
    y_index   : number,     // индексы с нуля
    negative  : boolean,    // если минимизация по нулям
    choosing  : Conjunction[],   
};
// результат выбора выражений
type SelectedExpr = {
    y_index  : number,
    negative : boolean,
};
// Значение конъюнктора типа K1 = X1 * X2 * X3
type KValue = {
    value   : Conjunction,
    color   : string,         // цвет выделения K
};
// Значение дизъюнктора типа !Y1 = K1 + K2 + K3
type YValue = {
    y_index   : number,
    negative  : boolean,
    k_indices : number[],   // индексы в массиве KValue
};
// Выражение типа Y1 = X2 X3 + X1 X4
type YExpression = {
    y_index  : number,
    negative : boolean,
    expr     : Conjunction[],
}

let state = {
    // Input
    x_count : 2,
    y_count : 2,
    input_values : [] as InputPair[],
    // Minimizing
    minimizing : [] as Minimizing[],
    // Selection
    selection : [] as SelectedExpr[],
    // Editing
    k_values : [] as KValue[],
    y_values : [] as YValue[],
    final_values : [] as YExpression[],
};