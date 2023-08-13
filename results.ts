let make_images = (m: Minimizing)=> {
    let images = [];

    let table  = new MinimizingTable(m.y_index, !m.negative);
    let canvas = by_id("minimizing_table") as HTMLCanvasElement; 

    let draw_border = (x: number, y: number, w: number, h: number, inner_padding: number, color: string)=> {
        let ctx = canvas.getContext("2d")!;

        let cw = ctx.canvas.width;
        let ch = ctx.canvas.height;

        // оставляем по 100 пикселей для значений X
        // если число строк и столбцов неодинаково, не растягиваем таблицу
        let cell_size = (Math.min(cw, ch) - 100) / Math.max(table.cols, table.rows)
        let padding   = 2;  // отступ клеток в пикселях

        let cell_x1 = cell_size * x + padding + inner_padding + 100;
        let cell_y1 = cell_size * y + padding + inner_padding + 100;
        let cell_x2 = cell_size * (x + w) - padding + 100 - inner_padding;
        let cell_y2 = cell_size * (y + h) - padding + 100 - inner_padding;

        ctx.strokeStyle = color;
        ctx.lineWidth   = 5;

        ctx.beginPath();
        ctx.roundRect(cell_x1, cell_y1, cell_x2 - cell_x1, cell_y2 - cell_y1, 10);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth   = 3;

        ctx.beginPath();
        ctx.roundRect(cell_x1, cell_y1, cell_x2 - cell_x1, cell_y2 - cell_y1, 10);
        ctx.closePath();
        ctx.stroke();
    }

    // Разделяем выбранные области, на каждую картинку по N штук максимум
    // Скорее всего бесполезная функция
    let choosing_index = 0;
    while (choosing_index < m.choosing.length) {
        draw_table(table);
        for (let ci = 0; ci < 10 && choosing_index < m.choosing.length; ci++) {
            let color        = next_color(1);
            let marked_cells = new Set();

            for (let x = 0; x < table.cols; x++)
            for (let y = 0; y < table.rows; y++) {
                if (!table.match_variant(x, y, m.choosing[choosing_index]))
                    continue;
                if (marked_cells.has(x * 1000 + y))
                    continue;

                let x2 = x + 1;
                while (true) {
                    if (x2 >= table.cols)
                        break;
                    if (!table.match_variant(x2, y, m.choosing[choosing_index]))
                        break;
                    x2++;
                }
                let y2 = y + 1;
                while (true) {
                    if (y2 >= table.rows)
                        break;
                    if (!table.match_variant(x, y2, m.choosing[choosing_index]))
                        break;
                    y2++;
                }

                for (let _x = x; _x < x2; _x++)
                for (let _y = y; _y < y2; _y++)
                    marked_cells.add(_x * 1000 + _y);

                draw_border(x, y, x2 - x, y2 - y, ci * 2, color);
            }
            choosing_index++;
        }
        images.push(canvas.toDataURL());
    }
    return images;
};


AppStateMgr.on_state_enter(AppState.Results, ()=> {
    let report = "";
    if (!state.minimizing_skip) {
        // входные данные
        report += `
        <table style="padding: 5px; border: 2px solid black; border-radius: 10px;">
            <tr>
                <th>Входные  сигналы X&nbsp;</th>
                <th>&nbsp;Выходные сигналы Y</th>
            </tr>
        `;
        for (let inp of state.input_values) {
            report += `
            <tr>
                <td style="text-align: center">${inp.x.data.toString(16)}</td>
                <td style="text-align: center">${inp.y.data.toString(16)}</td>
            </tr>
            `;
        }
        report += "</table>";

        // таблицы минимизации
        for (let min of state.minimizing) {
            report += `<div style="display: inline-block;">`;
            report += `Минимизация <b>Y${min.y_index + 1}</b> по <b>${min.negative ? "нулям" : "единицам"}</b><br>`;
            for (let image of make_images(min)) {
                report += `<image src="${image}" ></image>`;
            }
            report += "</div>";
        }

        report += "<br><b>Полученные выражения:</b><br>";
        for (let expr of state.minimizing) {
            report += `${expr.negative ? "!" : " "}Y${expr.y_index + 1} = ${expr_as_string(expr.choosing)}`;
            report += `&nbsp;(Сложность - <b>${get_expr_complexity(expr.choosing)}</b>)<br>`;
        }


        report += "<br><b>Выбранные выражения:</b><br>";
        for (let selection of state.selection) {
            let expr = state.minimizing.find(x => x.negative === selection.negative && x.y_index === selection.y_index)!;
            report += `${expr.negative ? "!" : " "}Y${expr.y_index + 1} = ${expr_as_string(expr.choosing)}`;
            report += `&nbsp;(Сложность - <b>${get_expr_complexity(expr.choosing)}</b>)<br>`;
        }
    }
    report += "<br><b>Редактированные выражения:</b><br>";
    let sum_complex = 0;
    for (let expr of state.y_values) {
        report += `${expr.negative ? "!" : " "}Y${expr.y_index + 1} = `;
        let y_html = [] as string[];
        let yexpr  = [] as Conjunction[];
        for (let k_index of expr.k_indices) {
            let k = state.k_values[k_index];
            yexpr.push(k.value);
            y_html.push(`<mark style="background-color: ${k.color}">${conjuction_as_string(k.value)}</mark>`);
        }
        let complexity = get_expr_complexity(yexpr);
        sum_complex += complexity;
        report += `${y_html.join("&#32;<b>+</b>&#32;")}&nbsp;(Сложность - <b>${complexity}</b>)<br>`;
    }
    report += `<br>Суммарная сложность: ${sum_complex}`;

    let sum_complex_rept = 0;
    let k_used = new Set<number>();
    for (let y of state.y_values) {
        for (let k_index of y.k_indices) {
            if (!k_used.has(k_index)) {
                k_used.add(k_index);
                sum_complex_rept += Math.max(0, state.k_values[k_index].value.variables.bits_set_count() * 2 - 1);
            }
        }
        sum_complex_rept += Math.max(0, y.k_indices.length - 1);
    }
    report += `<br>Cложность с учетом повторений: ${sum_complex_rept}`;


    report += `<div style="display: block; column-count:3; padding-top: 15px;">`;
    state.k_values.forEach((k, i)=> {
        report += `K${i + 1} = <mark style="background-color: ${k.color}">${conjuction_as_string(k.value)}</mark><br>`;
    });
    report += "</div>";

    report+= `<div style="display: block; padding-top: 15px;">`;
    state.y_values.forEach(y => {
        let k_html = [] as string[];
        for (let k_index of y.k_indices) {
            let k = state.k_values[k_index];
            k_html.push(`<mark style="background-color: ${k.color}">K${k_index + 1}</mark>`);
        }
        report += `${y.negative ? "!" : " "}Y${y.y_index + 1} = ${k_html.join("&#32;<b>+</b>&#32;")}<br>`;
    });
    report += "</div>";

    report += `<div style="display: block; padding-top: 15px;">`;
    report += "<br><b>Выражения в базисе шеффера:</b><br>";
    state.y_values.forEach(y => {
        let k_html = [] as string[];
        for (let k_index of y.k_indices) {
            let k = state.k_values[k_index];
            k_html.push(`!(<mark style="background-color: ${k.color}">${conjuction_as_string(k.value)}</mark>)`);
        }
        report += `${y.negative ? "!" : " "}Y${y.y_index + 1} = !(${k_html.join("&#32;<b>*</b>&#32;")})<br>`;
    });
    report += "</div>";

    report += `
    <br><b>Таблицы ПЛМ:</b><br>
    <table style="padding: 5px; border: 2px solid black; border-radius: 10px;">
        <tr>
            <th colspan="11">Конъюнктор</th>
        </tr>
        <tr>
            <th style="min-width: 70px;">Вход</th>
    `;
    for (let contact = 1; contact <= 50; contact += 5) {
        report += `<th style="border: 1px solid black; min-width: 70px;">${contact}..${contact + 4}</th>`;
    }
    report += "</tr>";
    for (let x_idx = 0; x_idx < state.x_count; x_idx++) {
        report += `<tr><td style="text-align: center;">${x_idx + 1}</td>`;
        for (let col = 0; col < 10; col++) {
            report += `<td style="border: 1px solid black; min-width: 70px; text-align: center;">`;
            for (let contact = col * 5; contact < col * 5 + 5 && contact < 48; contact++) {
                if (contact >= state.k_values.length) {
                    report += "N";
                    continue;
                }
                let k = state.k_values[contact];
                if (k.value.variables.get_bit_at(x_idx))
                    report += k.value.negative.get_bit_at(x_idx) ? "0" : "1";
                else
                    report += "*";
            }
            report += "</td>";
        }
        report += "</tr>"
    }
    report += "</table>";
    

    report += `
    <br>
    <table style="padding: 5px; border: 2px solid black; border-radius: 10px;">
        <tr>
            <th colspan="11">Дизъюнктор</th>
        </tr>
        <tr>
            <th style="min-width: 70px;">Выход</th>
    `;
    for (let contact = 1; contact <= 50; contact += 5) {
        report += `<th style="border: 1px solid black; min-width: 70px;">${contact}..${contact + 4}</th>`;
    }
    report += "</tr>";
    for (let y_idx = 0; y_idx < state.y_count; y_idx++) {
        let y = state.y_values[y_idx];
        report += `<tr><td style="text-align: center;">${y.negative ? "!" : "&nbsp;"}${y_idx + 1}</td>`;
        for (let col = 0; col < 10; col++) {
            report += `<td style="border: 1px solid black; min-width: 70px; text-align: center;">`;
            for (let contact = col * 5; contact < col * 5 + 5 && contact < 48; contact++) {
                if (contact >= state.k_values.length) {
                    report += "1";
                    continue;
                }
                report += y.k_indices.find(x => x === contact) !== undefined ? "1" : "0";
            }
            report += "</td>";
        }
        report += "</tr>"
    }
    report += "</table>";


    by_id("results").style.display = "block";
    by_id("results_content").innerHTML = report;
});