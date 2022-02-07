const average = (...values) =>
  values.reduce((prev, cur) => prev + cur, 0) / values.length;

class Table {
  static joinTables(...tables) {
    if (tables.length === 0) {
      throw new Error();
    }
    if (tables.length === 1) {
      return tables[0];
    }

    const size = tables[0].#columnsQuantity;

    if (!tables.every(table => table.#columnsQuantity === size)) {
      throw new Error();
    }

    const minRows = Math.min(...tables.map(x => x.#appearence.length));

    const table = new Table(size);

    for (let i = 0; i < minRows; i++) {
      table.addRow();

      const newRow = Array(size)
        .fill(0)
        .map((_, index) =>
          average(...tables.map(table => table.#appearence[i][index]))
        );
      table.#appearence[i] = newRow;
    }

    return table;
  }

  #appearence = [];
  #columnsQuantity = 0;
  constructor(size) {
    this.#columnsQuantity = size;
  }

  get columnsQuantity() {
    return this.#columnsQuantity;
  }

  get rowsQuantity() {
    return this.#appearence.length;
  }

  getArray() {
    return this.#appearence;
  }

  addRow() {
    this.#appearence.push(Array(this.#columnsQuantity).fill(0));
  }

  getRow(index) {
    return this.#appearence[index];
  }

  deleteRow(i) {
    this.#appearence = this.#appearence.filter((item, index) => index !== i);
  }

  getItem(rowIndex, columIndex) {
    return this.#appearence[rowIndex][columIndex];
  }

  updateItem(rowIndex, columIndex, value) {
    this.#appearence[rowIndex][columIndex] = value;
  }
}

class RowView {
  #editable = true;
  #row = [];
  onSave = () => {};
  onDelete = () => {};

  constructor(row, editable = true) {
    this.#row = row;
    this.#editable = editable;
  }

  getHTMLElement() {
    const element = document.createElement("tr");

    this.#row.forEach((item, index) => {
      const inputCell = document.createElement("td");
      const input = document.createElement("input");

      input.value = item;
      input.type = "number";

      if (!this.#editable) {
        input.disabled = true;
      }

      input.addEventListener("blur", ({ target: { value } }) => {
        this.onSave(value, index);
      });

      inputCell.append(input);

      element.append(inputCell);
    });

    if (this.#editable) {
      const buttonCell = document.createElement("td");
      const button = document.createElement("button");

      button.addEventListener("click", () => this.onDelete());

      button.innerText = "Delete";

      buttonCell.append(button);
      element.append(buttonCell);
    }

    return element;
  }
}

class TableView {
  #table = new Table(2);
  #editable = true;
  #tableHtmlElement = null;
  #tableRows = [];

  onActionButton = () => {};

  constructor(editable = true) {
    this.#table.addRow();
    this.#editable = editable;
  }

  getHTMLElement() {
    if (this.#tableHtmlElement) {
      return this.#tableHtmlElement;
    }

    const div = document.createElement("div");

    div.innerHTML = `<table>
      <thead>
        <tr>
          <th>x</th>
          <th>y</th>
        </tr>
      </thead>
      <tfoot>
        
      </tfoot>
      <tbody>
      </tbody>
    </table>`;

    this.#tableRows = this.#table
      .getArray()
      .map((row, index) => new RowView(row, this.#editable));
    const tfoot = div.getElementsByTagName("tfoot")[0];
    const tr = document.createElement("tr");
    const button = document.createElement("button");
    button.innerText = this.#editable ? "Add" : "Calculate";
    tr.append(button);
    tfoot.append(tr);
    button.addEventListener("click", () => this.#onActionButton());
    this.#tableHtmlElement = div;
    this.#drawRows();

    return this.#tableHtmlElement;
  }

  get table() {
    return this.#table;
  }

  updateTable(table) {
    this.#table = table;

    this.#tableRows = this.#table
      .getArray()
      .map((row, index) => new RowView(row, this.#editable));

    this.#drawRows();
  }

  #onActionButton() {
    if (this.#editable) {
      this.#table.addRow();
      const lastRow = this.#table.getRow(this.#table.rowsQuantity - 1);

      const rowView = new RowView(lastRow, this.#editable);

      this.#tableRows.push(rowView);
      this.#drawRows();
    } else {
      this.onActionButton();
    }
  }

  #drawRows() {
    const tbody = this.#tableHtmlElement.getElementsByTagName("tbody")[0];
    tbody.innerHTML = "";

    this.#tableRows.forEach((x, index) => {
      x.onSave = (value, colIndex) =>
        this.#table.updateItem(index, colIndex, parseFloat(value));

      x.onDelete = () => {
        if (this.#table.rowsQuantity === 1) {
          return;
        }

        this.#table.deleteRow(index);

        this.#tableRows = this.#tableRows.filter((_, i) => i !== index);
        this.#drawRows();
      };
    });

    tbody.append(...this.#tableRows.map(x => x.getHTMLElement()));
  }
}

class GraphicView {
  #table = new Table(2);
  #canvas = null;

  constructor(table) {
    this.#table = table;
  }

  getHTMLElement() {
    if (this.#canvas) {
      return this.#canvas;
    }

    const canvas = document.createElement("canvas");

    canvas.width = 500;
    canvas.height = 500;

    this.#canvas = canvas;
    return canvas;
  }

  #drawHelpLines(ctx, scale, size, xAxis, yAxis, horizontal = true) {
    const shiftNumberNames = 5;

    ctx.beginPath();
    ctx.strokeStyle = "#f5f0e8";

    ctx.font = `${scale / 2}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (let i = 0; i < size; i += scale) {
      if (!horizontal) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);

        ctx.fillText(
          (i - xAxis) / scale,
          i + shiftNumberNames,
          yAxis + shiftNumberNames
        );
      } else {
        ctx.moveTo(0, i);

        ctx.lineTo(size, i);

        ctx.fillText(
          (yAxis - i) / scale,
          xAxis + shiftNumberNames,
          i + shiftNumberNames
        );
      }
    }

    ctx.stroke();
    ctx.closePath();
  }

  #drawAxis(ctx, axis, size, horizontal = true) {
    const shiftAxisNames = 20;
    ctx.beginPath();
    ctx.strokeStyle = "#000000";

    if (horizontal) {
      ctx.moveTo(axis, 0);
      ctx.lineTo(axis, size);
      ctx.fillText("y", axis - shiftAxisNames, 0);
    } else {
      ctx.moveTo(0, axis);
      ctx.lineTo(size, axis);
      ctx.fillText("x", size - shiftAxisNames, axis - shiftAxisNames);
    }

    ctx.stroke();
    ctx.closePath();
  }

  #drawGraphic(ctx, xAxis, yAxis, scaleX, scaleY) {
    const getXCanvas = point => xAxis + point * scaleX;
    const getYcanvas = point => yAxis - point * scaleY;

    const arr = this.#table.getArray();
    ctx.beginPath();

    if (arr.length === 1) {
      ctx.fillRect(
        getXCanvas(arr[0][0]) - 2.5,
        getYcanvas(arr[0][1]) - 2.5,
        5,
        5
      );
    }

    ctx.moveTo(getXCanvas(arr[0][0]), getYcanvas(arr[0][1]));

    for (let i = 1; i < arr.length; i++) {
      const [x, y] = arr[i];

      const xCanv = getXCanvas(x);
      const yCanv = getYcanvas(y);

      ctx.lineTo(xCanv, yCanv);
    }
    ctx.stroke();

    ctx.closePath();
  }

  draw() {
    const canvasWidth = this.#canvas.clientWidth;
    const canvasHeight = this.#canvas.clientHeight;

    const scaleX = 25;
    const scaleY = 25;
    const xAxis = Math.round(canvasWidth / scaleX / 2) * scaleX;
    const yAxis = Math.round(canvasHeight / scaleY / 2) * scaleY;

    const ctx = this.#canvas.getContext("2d");

    this.#drawHelpLines(ctx, scaleX, canvasHeight, xAxis, yAxis, true);
    this.#drawHelpLines(ctx, scaleY, canvasWidth, xAxis, yAxis, false);

    this.#drawAxis(ctx, xAxis, canvasWidth);
    this.#drawAxis(ctx, yAxis, canvasHeight, false);
    this.#drawGraphic(ctx, xAxis, yAxis, scaleX, scaleY);
  }
}

const tableView1 = new TableView();
const tableView2 = new TableView();
const tableView3 = new TableView(false);

tableView3.onActionButton = () => {
  const resultTable = Table.joinTables(tableView1.table, tableView2.table);
  tableView3.updateTable(resultTable);

  const canvas1 = new GraphicView(tableView1.table);
  const canvas2 = new GraphicView(tableView2.table);
  const canvas3 = new GraphicView(resultTable);

  const previous = document
    .querySelector(".canvas")
    .getElementsByTagName("canvas");
  while (previous.length) {
    previous[0].parentNode.removeChild(previous[0]);
  }
  const canvasClass = document.querySelector(".canvas");
  canvasClass.append(canvas1.getHTMLElement());
  canvasClass.append(canvas2.getHTMLElement());
  canvasClass.append(canvas3.getHTMLElement());

  canvas1.draw();
  canvas2.draw();
  canvas3.draw();
};
const tableClass = document.querySelector(".table");
tableClass.append(tableView1.getHTMLElement());
tableClass.append(tableView2.getHTMLElement());
tableClass.append(tableView3.getHTMLElement());
