(function(global){
  class Grid {
    constructor(opts){
      this.opts = opts || {};
      this._el = null;
    }
    render(el){
      this._el = el;
      this._render();
    }
    updateConfig(opts){
      this.opts = Object.assign({}, this.opts, opts);
      return this;
    }
    forceRender(){
      this._render();
    }
    _render(){
      if(!this._el) return;
      const cols = this.opts.columns || [];
      const data = this.opts.data || [];
      const table = document.createElement('table');
      if (this.opts.style && this.opts.style.table){
        Object.assign(table.style, this.opts.style.table);
      }
      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      for(const c of cols){
        const th = document.createElement('th');
        th.textContent = typeof c === 'string' ? c : (c.name || '');
        trHead.appendChild(th);
      }
      thead.appendChild(trHead);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for(const row of data){
        const tr = document.createElement('tr');
        row.forEach((cell, idx) => {
          const td = document.createElement('td');
          const col = cols[idx] || {};
          let val = cell;
          if (typeof col.formatter === 'function'){
            val = col.formatter(cell);
          }
          td.textContent = (val === null || val === undefined) ? '' : val;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      this._el.innerHTML = '';
      this._el.appendChild(table);
    }
  }
  global.gridjs = { Grid };
})(typeof window !== 'undefined' ? window : this);
