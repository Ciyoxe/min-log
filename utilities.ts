
let by_id    = (i: string)=> document.getElementById(i)!;
let by_class = (c: string)=> document.getElementsByClassName(c);

let remove_class = (classname: string)=> {
    for (let elem of [...by_class(classname)]) 
        elem.classList.remove(classname);
}
let add_class_for = (elem: Element, classname: string, timeout_ms: number)=> {
    elem.classList.add(classname);
    setTimeout(()=> elem.classList.remove(classname), timeout_ms);
}


/**
 * Список html элементов
 */
class ListOfElements {
    private id_map = [] as { id: number, index: number }[];
    private generate_fn;
    private init_fn;
    private mount_point;
    private id_counter;

    private make_element(e: string) {
        let template = document.createElement("template");
        template.innerHTML = e.trim();
        return template.content.firstChild as HTMLElement;
    }

    /**
     * 
     * @param mount_point   родительский элемент для списка
     * @param generate_fn   генерация html кода по уникальному id элемента списка
     * @param init_fn       инициализация элемента с уникальным id
     */
    constructor(mount_point: HTMLElement, generate_fn: (id: number)=> string, init_fn = (id: number)=> {}) {
        this.mount_point = mount_point;
        this.id_counter  = 0;
        this.generate_fn = generate_fn;
        this.init_fn     = init_fn;

        for (let c of [...mount_point.children])
            c.remove();
    }

    get length() {
        return this.mount_point.children.length;
    }

    /** 
     * Получить элемент по индексу, индекс не указан - последний эелемент
    */
    get_by_index(index: number | null = null) {
        if (index === null)
            index = this.length - 1;
        return this.mount_point.children[index];
    }
    /** 
     * Получить элемент по id
    */
    get_by_id(id: number) {
        return this.mount_point.children[this.index_of(id)];
    }
    /**
     * Получить индекс элемента по id
     */
    index_of(id: number) {
        return this.id_map.find(x => x.id === id)!.index;
    }
    /**
     * Получить id элемента по индексу
     */
    id_of(index: number) {
        return this.id_map.find(x => x.index === index)!.id;
    }
    /**
     * Добавить элемент по индексу (индекс не указан - добавить в конец)
     */
    append(index: number | null = null) {
        if (index === null)
            index = this.length;

        let new_id      = this.id_counter++;
        let new_element = this.make_element(this.generate_fn(new_id));

        if (index === this.length)
            this.mount_point.appendChild(new_element);
        else
            this.mount_point.insertBefore(new_element, this.mount_point.children[index]);
        
            this.id_map.forEach(x => { if (x.index >= index!) x.index++ });
            this.id_map.push({ id: new_id, index: index });
            this.init_fn(new_id);
    }
    /**
     * Удалить элемент по индексу (индекс не указан - последний элемент)
     */
    remove(index: number | null = null) {
        if (index === null)
            index = this.length - 1;
        this.id_map.splice(this.id_map.findIndex(x => x.index === index), 1);
        this.id_map.forEach(x => { if (x.index > index!) x.index-- });
        this.mount_point.children[index].remove();
    }
    /**
     * Удалить элемент по id
     */
    remove_id(id: number) {
        let removed = this.id_map.find(x => x.id === id);
        if (removed)
            this.remove(removed.index);
    }
}

class BitField {
    data;

    constructor(data = 0) {
        this.data = data;
    }

    get_bit_at(index: number) {
        return (this.data >> index & 1) === 1;
    }
    set_bit_at(index: number, value: boolean) {
        if (value)
            this.data |= 1 << index;
        else 
            this.data &= ~(1 << index);
    }
    bits_set_count() {
        let n = this.data - ((this.data >> 1) & 0x55555555);
        n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
        return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
    }

    and(other: BitField) {
        return new BitField(this.data & other.data);
    }
    or(other: BitField) {
        return new BitField(this.data | other.data);
    }
    xor(other: BitField) {
        return new BitField(this.data ^ other.data);
    }
    eq(other: BitField) {
        return this.data === other.data;
    }
}

//roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (
        x : number, y : number,
        w : number, h : number,
        r : number,
    ) {
        const ctx = this;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
