
let equal_conjunctions = (a: Conjunction, b: Conjunction)=> 
    a.negative.eq(b.negative) && a.variables.eq(b.variables);

let conjuction_as_string = (c: Conjunction)=> {
    let str = "";
    for (let i = 0; i < 32; i++) {
        if (c.variables.get_bit_at(i)) {
            if (c.negative.get_bit_at(i))
                str += "!";
            str += `X${i + 1} `;
        }
    }
    if (c.variables.bits_set_count() === 0)
        str = "0";
    return str.trim();
};

type TableEntry = {
    value    : boolean | null,
    covered  : boolean, // серая подсветка
    selected : boolean, // красная подсветка
};

class MinimizingTable {
    private vrtns = [] as Conjunction[];
    private table = [] as TableEntry[];
    
    private y_index; // по какой переменнной идет минимизация Y1 = 0
    private target;  // по какому числу идет минимизация - 1 = true

    inputs;
    cols;
    rows;


    constructor(y_index: number, target: boolean) {
        this.cols = 2 ** Math.ceil(state.x_count / 2);
        this.rows = 2 ** Math.floor(state.x_count / 2);
        
        this.target  = target;
        this.inputs  = state.x_count;
        this.y_index = y_index;

        this.fill_table(state.input_values);
        this.generate_variants();
    }

    table_at(col: number, row: number) {
        return this.table[row * this.cols + col];
    }
    get_variants() {
        return this.vrtns;
    }

    reset() {
        for (let c = 0; c < this.cols; c++)
        for (let r = 0; r < this.rows; r++) {
            this.table_at(c, r).selected = false;
            this.table_at(c, r).covered  = false;
        }
        this.generate_variants();
    }
    select_variant(variant: Conjunction) {
        for (let c = 0; c < this.cols; c++)
        for (let r = 0; r < this.rows; r++) {
            this.table_at(c, r).selected = this.match_variant(c, r, variant);
        }
    }
    apply_variant(variant: Conjunction) {
        for (let c = 0; c < this.cols; c++)
        for (let r = 0; r < this.rows; r++) {
            this.table_at(c, r).covered ||= this.match_variant(c, r, variant);
            this.table_at(c, r).selected = false;
        }
    }
    can_apply_variant(variant: Conjunction) {
        let can_apply = false;
        for (let c = 0; c < this.cols; c++)
        for (let r = 0; r < this.rows; r++) {
            let table = this.table_at(c, r);
            if (this.match_variant(c, r, variant)) {
                // вариант не должен закрывать неправильные числа таблицы
                if (table.value === !this.target)
                    return false;
                // вариант должен закрывать хотя бы одно новое число
                if (table.value === this.target && !table.covered)
                    can_apply = true;
            }
        }
        return can_apply;
    }
    match_variant(col: number, row: number, variant: Conjunction) {
        return this.x_value_at(col, row).and(variant.variables).xor(variant.negative).eq(variant.variables)
    }

    private x_value_at(col: number, row: number) {
        // Строки и столбцы карты Карно - код Грэя
        let col_code = col ^ (col >> 1);
        let row_code = row ^ (row >> 1);
        // для 5 входов биты - x5 x4 x3 x2 x1
        // столбцы - x1 x2 x3, строки - x4 x5
        // код строки нужно сдвинуть на количество переменных в столбце
        return new BitField(col_code | (row_code << Math.ceil(this.inputs / 2)));
    }
    private fill_table(values: InputPair[]) {
        this.table = [];
        for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++) {
            let x_value = this.x_value_at(c, r);
            let y_value = values.find(i => i.x.eq(x_value));
            this.table.push({
                value    : y_value ? y_value.y.get_bit_at(this.y_index) : null,
                covered  : false,
                selected : false,
            })
        }
    }
    private generate_variants() {
        this.vrtns = [];
        // варианты [X1], [X2], [X3], [X1 X2], [X1 X3], [X2 X3], [X1 X2 X3] для 3 входов
        // перебираем комбинации битов, например [X2 X3] - 110  [X1 X3] - 101
        for (let vars_comb = 1; vars_comb < 2 ** this.inputs; vars_comb++) {
            // варианты знака, например [!X1 X3] - 001 [!X2 X1] - 10
            // нужно перебрать все комбинации знаков,
            // для vars = 101 перебираем 000, 001, 100, 101
            let masked_saved = new Set<number>();
            for (let neg_comb = 0; neg_comb <= vars_comb; neg_comb++) {
                let masked_bits = vars_comb & neg_comb;
                // варианты не должны повторяться
                if (!masked_saved.has(masked_bits)) {
                    masked_saved.add(masked_bits);
                    this.vrtns.push({
                        variables : new BitField(vars_comb),
                        negative  : new BitField(masked_bits),
                    });
                }
            }
        }
        // оставляем только валидные варианты
        this.vrtns = this.vrtns.filter(x => this.can_apply_variant(x));
        // сортируем по количеству переменных
        this.vrtns.sort((a, b) => a.variables.bits_set_count() - b.variables.bits_set_count());
    }
}

let draw_table = (table: MinimizingTable)=> {
    let ctx = (by_id("minimizing_table") as HTMLCanvasElement).getContext("2d")!;

    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.font         = "36px serif";

    let w   = ctx.canvas.width;
    let h   = ctx.canvas.height;

    // оставляем по 100 пикселей для значений X
    // если число строк и столбцов неодинаково, не растягиваем таблицу
    let cell_size = (Math.min(w, h) - 100) / Math.max(table.cols, table.rows)
    let padding   = 2;  // отступ клеток в пикселях
    let rounding  = 10; // закругление клеток

    ctx.clearRect(0, 0, w, h);

    for (let c = 0; c < table.cols; c++)
    for (let r = 0; r < table.rows; r++) {
        let cell_x = cell_size * c + padding + 100;
        let cell_y = cell_size * r + padding + 100;
        let cell_s = cell_size - 2 * padding;

        let cell_data = table.table_at(c, r);
        ctx.fillStyle = 
            cell_data.selected ? "red" :
            cell_data.covered  ? "rgb(180, 188, 206)" : "rgb(212, 216, 223)";
        ctx.beginPath();
        ctx.roundRect(cell_x, cell_y, cell_s, cell_s, rounding);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "black";
        let text = 
            cell_data.value === false ? "0" :
            cell_data.value === true  ? "1" : "*";
        ctx.fillText(text, cell_x + cell_s * 0.5, cell_y + cell_s * 0.5 + 3);
    }

    ctx.fillStyle = "black";
    ctx.font      = "16px serif";

    // надписи в углу таблицы
    let vars_in_row = Math.ceil(table.inputs / 2);
    let vars_in_col = Math.floor(table.inputs / 2);
    for (let v = 0; v < vars_in_row; v++) {
        ctx.fillText(`X${v + 1}`, 92, 23 * (v + 1));
    }
    for (let v = 0; v < vars_in_col; v++) {
        ctx.fillText(`X${v + vars_in_row + 1}`, 23 * (v + 1), 92);
    }

    //надписи столбцов и строк
    for (let r = 0; r < table.cols; r++) {
        let row_cx = cell_size * (r + 0.5) + 100;
        let v_bits = new BitField(r ^ (r >> 1));
        for (let v = 0; v < vars_in_row; v++) {
            ctx.fillText(v_bits.get_bit_at(v) ? "1" : "0", row_cx, 23 * (v + 1));
        }
    }
    for (let c = 0; c < table.rows; c++) {
        let col_cy = cell_size * (c + 0.5) + 100;
        let v_bits = new BitField(c ^ (c >> 1));
        for (let v = 0; v < vars_in_col; v++) {
            ctx.fillText(v_bits.get_bit_at(v) ? "1" : "0", 23 * (v + 1), col_cy);
        }
    }
}

AppStateMgr.on_state_enter(AppState.Minimizing, ()=> {
    by_id("minimizing").style.display = "flex";

    let table   : MinimizingTable;
    let tar_val = false;
    let y_index = -1;

    // выбранный вариант
    let var_act  = null as number | null;
    let var_list = new ListOfElements(
        by_id("minimizing_variants"),
        id => `<div id="variant_${id}" class="variant"></div>`,
        id => by_id(`variant_${id}`).onclick = ()=> {
            if (var_act !== null)
                var_list.get_by_index(var_act).classList.remove("selected_variant");
            var_act = var_list.index_of(id);
            var_list.get_by_id(id).classList.add("selected_variant");

            table.select_variant(table.get_variants()[var_act]);
            draw_table(table);
        },
    );

    
    let next_minimizing = ()=> {
        // следующие значения для минимизации
        if (y_index + 1 === state.y_count) {
            // если было последнее - возвращаем false
            if (tar_val)
                return false;
            tar_val = true;
            y_index = 0;
        }
        else y_index++;
        // снимаем выделение
        var_act = null;

        by_id("minimizing_text").innerHTML = `
        Минимизация Y${y_index + 1} по ${tar_val ? "единицам" : "нулям"}<br>
        Закройте все ${tar_val ? "единицы" : "нули"} наименьшим количеством наибольших по площади областей
        `;

        table = new MinimizingTable(y_index, tar_val);
        table.get_variants().forEach(v => {
            var_list.append();
            var_list.get_by_index().textContent = conjuction_as_string(v);
        });

        state.minimizing.push({
            choosing  : [],
            negative  : !tar_val,
            y_index
        });

        draw_table(table);
        return true;
    }
    let filter_variants = ()=> {
        let variants = table.get_variants();
        // оставляем в списке только те варианты, которые можно применить
        for (let i = variants.length - 1; i >= 0; i--) {
            if (!table.can_apply_variant(variants[i])) {
                variants.splice(i, 1);
                var_list.remove(i);
            }
        }
    }
    next_minimizing();

    by_id("apply_variant").onclick = ()=> {
        if (var_act === null || table.get_variants().length === 0) {
            add_class_for(by_id("apply_variant"), "wrong", 500);
            return;
        }
        // сохраняем примененный вариант
        state.minimizing[state.minimizing.length - 1].choosing.push(table.get_variants()[var_act]);
        // перерисовываем таблицу, убираем лишние варианты
        table.apply_variant(table.get_variants()[var_act]);
        filter_variants();
        draw_table(table);
        // снимаем выделение
        var_act = null;
    }
    by_id("erase_variants").onclick = ()=> {
        // удаляем варианты
        table.reset();
        state.minimizing[state.minimizing.length - 1].choosing = [];

        // снимаем выделение
        var_act = null;
        // создаем список вариантов заново
        while (var_list.length > 0)
            var_list.remove();
        table.get_variants().forEach(v => {
            var_list.append();
            var_list.get_by_index().textContent = conjuction_as_string(v);
        });
        // перерисовываем таблицу
        draw_table(table);
    }
    by_id("minimizing_next").onclick = ()=> {
        // пропускаем далее, если все числа закрыты и больше нет доступных вариантов
        if (table.get_variants().length !== 0)
            add_class_for(by_id("minimizing_next"), "wrong", 500);
        else
        if (!next_minimizing())
            AppStateMgr.go_to_state(AppState.Selection);
    }
});
AppStateMgr.on_state_exit(AppState.Minimizing, ()=> {
    by_id("minimizing").style.display = "none";
});