/* RADS shared map template v1 — rads-map.js
   Builds the title chip, note popover, layers panel and legend from a small config object.
   Needs Leaflet (already loaded by the map page) and rads-map.css. No other dependencies.

   Usage (see README.md for the full reference):
     var map = L.map('map', ...);
     ...map's own layers...
     RadsMap.init(map, RADS_MAP_CONFIG, { onLayer:fn, onBase:fn, onSearch:fn, ... });
*/
(function(global){
  'use strict';

  var VERSION = '1.1.0';
  var NARROW = 600;                 // below this width the panel starts collapsed
  var BUDGET = {title:60, layers:6, note:300};

  var S = {map:null, cfg:null, h:{}, ui:{}, inputs:{}, layerItems:{}, baseItems:{}, uid:0};

  /* ── helpers ──────────────────────────────────────────────────────────── */
  function el(tag, attrs, kids){
    var n = document.createElement(tag);
    if(attrs) Object.keys(attrs).forEach(function(k){
      var v = attrs[k];
      if(v === null || v === undefined || v === false) return;
      if(k === 'text') n.textContent = v;
      else if(k === 'className') n.className = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function(c){ if(c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function id(prefix){ return 'rads-' + prefix + '-' + (++S.uid); }
  function call(name){
    var fn = S.h[name];
    if(typeof fn === 'function') fn.apply(null, Array.prototype.slice.call(arguments, 1));
  }
  function warn(msg){ if(global.console) console.warn('[rads-map] ' + msg); }
  function narrow(){ return (global.innerWidth || document.documentElement.clientWidth) < NARROW; }
  function stopMap(node){
    if(global.L && L.DomEvent){ L.DomEvent.disableClickPropagation(node); L.DomEvent.disableScrollPropagation(node); }
  }
  // UI goes before the map container so keyboard users reach it before the map's shapes
  function mount(node){
    var anchor = S.map && S.map.getContainer();
    if(anchor && anchor.parentNode === document.body) document.body.insertBefore(node, anchor);
    else document.body.appendChild(node);
  }
  function refresh(){ if(S.map) S.map.invalidateSize({pan:false}); }
  function query(name){
    var m = new RegExp('[?&#]' + name + '=([^&#]*)').exec(global.location.search + global.location.hash);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* ── title chip and note ──────────────────────────────────────────────── */
  var INFO_ICON = '<svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
                  '<rect x="8.1" y="7.6" width="1.8" height="5.6" fill="currentColor"/><rect x="8.1" y="4.4" width="1.8" height="1.8" fill="currentColor"/></svg>';
  function buildChip(cfg){
    var title = cfg.title || '';
    if(title.length > BUDGET.title) warn('title is ' + title.length + ' characters; budget is ' + BUDGET.title + '.');
    var h1 = el('h1', {text:title, title:title});
    var chip = el('div', {className:'rads-ui rads-chip'}, [h1]);

    if(cfg.note){
      if(cfg.note.length > BUDGET.note) warn('note is ' + cfg.note.length + ' characters; budget is ' + BUDGET.note + '.');
      var popId = id('note');
      var btn = el('button', {type:'button', className:'rads-info-btn', 'aria-expanded':'false',
                              'aria-controls':popId, 'aria-label':'About this map', title:'About this map'});
      btn.innerHTML = INFO_ICON;
      var pop = el('div', {id:popId, className:'rads-ui rads-popover', role:'dialog', 'aria-label':'About this map',
                           hidden:true, tabindex:'-1', text:cfg.note});
      chip.appendChild(btn);
      stopMap(pop);
      S.ui.noteBtn = btn; S.ui.note = pop;

      btn.addEventListener('click', function(){ setNote(pop.hidden); });
      document.addEventListener('keydown', function(e){
        if((e.key === 'Escape' || e.key === 'Esc') && !pop.hidden){ setNote(false); btn.focus(); }
      });
      document.addEventListener('pointerdown', function(e){
        if(!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) setNote(false);
      });
    }
    mount(chip);
    if(S.ui.note) mount(S.ui.note);
    stopMap(chip);
    S.ui.chip = chip;
  }
  function setNote(open){
    if(!S.ui.note) return;
    S.ui.note.hidden = !open;
    S.ui.noteBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ── status line ──────────────────────────────────────────────────────── */
  function buildStatus(){
    var s = el('div', {className:'rads-ui rads-status', role:'status', 'aria-live':'polite', hidden:true});
    mount(s);
    S.ui.status = s;
  }
  function setStatus(text){
    if(!S.ui.status) return;
    S.ui.status.textContent = text || '';
    S.ui.status.hidden = !text;
  }

  /* ── panel ────────────────────────────────────────────────────────────── */
  var ICON = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1 1 4.5 8 8l7-3.5L8 1Z" fill="currentColor"/>' +
             '<path d="M1 8l7 3.5L15 8M1 11.5 8 15l7-3.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

  function buildPanel(cfg){
    var bodyId = id('panel');
    var btn = el('button', {type:'button', className:'rads-toggle', 'aria-expanded':'false', 'aria-controls':bodyId});
    btn.innerHTML = ICON + '<span>Layers</span>';
    var body = el('div', {id:bodyId, className:'rads-body', role:'region', 'aria-label':'Map layers', hidden:true});
    var panel = el('div', {className:'rads-ui rads-panel'}, [btn, body]);
    S.ui.panel = panel; S.ui.toggle = btn; S.ui.body = body;

    if(cfg.search) body.appendChild(searchSection(cfg.search));
    if(cfg.zoomTo && cfg.zoomTo.length) body.appendChild(zoomSection(cfg.zoomTo));
    if(cfg.baseLayers && cfg.baseLayers.length > 1) body.appendChild(baseSection(cfg.baseLayers));
    if(cfg.layers && cfg.layers.length) body.appendChild(layerSection(cfg.layers));
    if(cfg.timeSlider) body.appendChild(timeSection(cfg.timeSlider));
    var leg = el('section', {className:'rads-sec', 'aria-label':'Legend'}, [el('h2', {text:'Legend'})]);
    var list = el('div', {className:'rads-legend-list'});
    leg.appendChild(list);
    body.appendChild(leg);
    S.ui.legendSec = leg; S.ui.legend = list;

    btn.addEventListener('click', function(){ setPanel(body.hidden); });
    mount(panel);
    stopMap(body);
    stopMap(btn);

    var force = query('panel');
    var open = force === 'open' ? true : force === 'closed' ? false :
               (cfg.startCollapsed === true ? false : !narrow());
    setPanel(open, true);
  }
  function setPanel(open, silent){
    if(!S.ui.body) return;
    S.ui.body.hidden = !open;
    S.ui.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    refresh();
    if(!silent) call('onPanel', open);
  }

  function searchSection(opt){
    var o = (typeof opt === 'object') ? opt : {};
    var inId = id('search');
    var input = el('input', {id:inId, type:'search', className:'rads-search', autocomplete:'off',
                             placeholder:o.placeholder || '', spellcheck:'false'});
    var sec = el('section', {className:'rads-sec'}, [el('h2', {}, [el('label', {'for':inId, text:o.label || 'Search'})]), input]);
    input.addEventListener('input', function(){ call('onSearch', input.value.trim().toLowerCase(), input.value); });
    S.inputs.search = input;
    return sec;
  }

  function zoomSection(items){
    var sec = el('section', {className:'rads-sec', 'aria-label':'Zoom to'}, [el('h2', {text:'Zoom to'})]);
    var row = el('div', {className:'rads-zoomto'});
    items.forEach(function(it){
      var b = el('button', {type:'button', className:'rads-chipbtn', text:it.label});
      b.addEventListener('click', function(){ call('onZoomTo', it.id); });
      row.appendChild(b);
    });
    sec.appendChild(row);
    return sec;
  }

  function baseSection(items){
    var name = id('base');
    var fs = el('fieldset', {className:'rads-sec'}, [el('legend', {text:'Base layer'})]);
    items.forEach(function(it){
      var input = el('input', {type:'radio', name:name, checked:!!it.defaultOn});
      var row = el('label', {className:'rads-row'}, [input, el('span', {className:'rads-lbl', text:it.label})]);
      input.addEventListener('change', function(){ if(input.checked) selectBase(it.id, false); });
      fs.appendChild(row);
      S.baseItems[it.id] = it; S.inputs['base:' + it.id] = input;
    });
    return fs;
  }
  function selectBase(baseId, silentUI){
    Object.keys(S.baseItems).forEach(function(k){
      var it = S.baseItems[k], on = (k === baseId);
      if(it.layer && S.map){ if(on){ if(!S.map.hasLayer(it.layer)) it.layer.addTo(S.map); } else if(S.map.hasLayer(it.layer)) S.map.removeLayer(it.layer); }
      if(silentUI && S.inputs['base:' + k]) S.inputs['base:' + k].checked = on;
    });
    if(!silentUI) call('onBase', baseId);
  }

  function layerSection(items){
    if(items.length > BUDGET.layers) warn(items.length + ' layer toggles; budget is ' + BUDGET.layers + '.');
    var sec = el('fieldset', {className:'rads-sec'}, [el('legend', {text:'Layers'})]);
    var groups = {};
    items.forEach(function(it){
      var type = it.group ? 'radio' : 'checkbox';
      if(it.group && !groups[it.group]) groups[it.group] = id('grp');
      var input = el('input', {type:type, name:it.group ? groups[it.group] : null,
                               checked:!!it.defaultOn, disabled:!!it.disabled});
      var kids = [input];
      if(it.swatch) kids.push(swatch(it.swatch));
      kids.push(el('span', {className:'rads-lbl', text:it.label}));
      var row = el('label', {className:'rads-row' + (it.disabled ? ' is-disabled' : ''), title:it.disabled && it.disabledReason ? it.disabledReason : null}, kids);
      sec.appendChild(row);
      input.addEventListener('change', function(){
        if(it.group){
          items.forEach(function(o){ if(o.group === it.group && o.id !== it.id) applyLayer(o, false, true); });
        }
        applyLayer(it, input.checked, true);
      });
      S.layerItems[it.id] = it; S.inputs['layer:' + it.id] = input;

      if(it.opacity){
        var rid = id('op'), v = Math.round(100 * (it.opacityValue === undefined ? 1 : it.opacityValue));
        var range = el('input', {id:rid, type:'range', min:'0', max:'100', step:'5', value:String(v),
                                 'aria-label':it.label + ' opacity'});
        var out = el('output', {'for':rid, text:v + '%'});
        range.addEventListener('input', function(){
          out.textContent = range.value + '%';
          var f = range.value / 100;
          if(it.layer && typeof it.layer.setOpacity === 'function') it.layer.setOpacity(f);
          call('onOpacity', it.id, f);
        });
        sec.appendChild(el('div', {className:'rads-range is-sub'}, [el('span', {'aria-hidden':'true', text:'Opacity'}), range, out]));
      }
    });
    return sec;
  }
  function applyLayer(it, on, notify){
    if(it.layer && S.map){ if(on){ if(!S.map.hasLayer(it.layer)) it.layer.addTo(S.map); } else if(S.map.hasLayer(it.layer)) S.map.removeLayer(it.layer); }
    if(notify) call('onLayer', it.id, on);
  }

  function timeSection(t){
    var rid = id('time');
    var v = t.value !== undefined ? t.value : t.max;
    var range = el('input', {id:rid, type:'range', min:String(t.min), max:String(t.max), step:String(t.step || 1), value:String(v)});
    var out = el('output', {'for':rid, text:String(v)});
    var sec = el('section', {className:'rads-sec'}, [
      el('h2', {}, [el('label', {'for':rid, text:t.label || 'Year'})]),
      el('div', {className:'rads-range'}, [range, out])
    ]);
    range.addEventListener('input', function(){ out.textContent = range.value; call('onTime', Number(range.value)); });
    S.inputs.time = range;
    return sec;
  }

  /* ── legend ───────────────────────────────────────────────────────────── */
  function swatch(it){
    var shape = it.shape || 'square';
    var s = el('span', {className:'rads-sw is-' + shape, 'aria-hidden':'true'});
    if(shape === 'line' || shape === 'dash' || shape === 'outline') s.style.color = it.color;
    else s.style.background = it.color;
    return s;
  }
  function setLegend(items){
    var list = S.ui.legend;
    if(!list) return;
    list.innerHTML = '';
    (items || []).forEach(function(it){
      if(it.heading){ list.appendChild(el('div', {className:'rads-leg-h', text:it.heading})); return; }
      if(it.gradient){
        var g = el('div', {className:'rads-grad'});
        if(it.label) g.appendChild(el('div', {className:'rads-leg', text:it.label}));
        var bar = el('div', {className:'rads-bar', 'aria-hidden':'true'});
        bar.style.background = 'linear-gradient(90deg,' + it.gradient.join(',') + ')';
        g.appendChild(bar);
        g.appendChild(el('div', {className:'rads-ends'}, [el('span', {text:String(it.min === undefined ? '' : it.min)}),
                                                          el('span', {text:String(it.max === undefined ? '' : it.max)})]));
        list.appendChild(g);
        return;
      }
      if(it.toggle){
        var input = el('input', {type:'checkbox', checked:it.defaultOn !== false});
        var row = el('label', {className:'rads-row'}, [input, swatch(it), el('span', {className:'rads-lbl', text:it.label})]);
        input.addEventListener('change', function(){ call('onLegendToggle', it.toggle, input.checked); });
        S.inputs['legend:' + it.toggle] = input;
        list.appendChild(row);
        return;
      }
      list.appendChild(el('div', {className:'rads-leg'}, [swatch(it), el('span', {text:it.label})]));
    });
    S.ui.legendSec.hidden = !(items && items.length);
  }

  /* ── popups: sized and padded so they stay clear of the chip and panel ── */
  function popupOptions(extra){
    var size = S.map ? S.map.getSize() : {x:713, y:678};
    var panelOpen = S.ui.body && !S.ui.body.hidden;
    var right = panelOpen && !narrow() ? Math.min(S.ui.panel.offsetWidth, size.x / 2) + 24 : 12;
    var o = {
      // 64 px clears the zoom control; ~32 px is the popup's own padding and border
      maxWidth:Math.max(160, Math.min(300, size.x - 64 - right - 32)),
      maxHeight:Math.max(160, size.y - 140),
      autoPanPaddingTopLeft:L.point(64, 64),
      autoPanPaddingBottomRight:L.point(right, 44),
      className:'rads-popup'
    };
    if(extra) Object.keys(extra).forEach(function(k){ o[k] = extra[k]; });
    return o;
  }
  function popupDefaults(){
    if(!(global.L && L.Popup)) return;
    var o = popupOptions();
    L.Popup.mergeOptions({maxWidth:o.maxWidth, maxHeight:o.maxHeight, autoPanPaddingTopLeft:o.autoPanPaddingTopLeft,
                          autoPanPaddingBottomRight:o.autoPanPaddingBottomRight});
  }
  function popup(latlng, html, extra){
    return L.popup(popupOptions(extra)).setLatLng(latlng).setContent(html).openOn(S.map);
  }

  /* ── init ─────────────────────────────────────────────────────────────── */
  function init(map, cfg, handlers){
    if(S.map){ warn('init called twice; ignored.'); return api; }
    S.map = map; S.cfg = cfg || {}; S.h = handlers || {};
    cfg = S.cfg;

    // no "Leaflet" link in the attribution strip; tile credits stay
    if(map.attributionControl) map.attributionControl.setPrefix(false);
    buildChip(cfg);
    buildStatus();
    buildPanel(cfg);
    setLegend(cfg.legend || []);

    // apply the defaults once, through the same paths a click would take
    var bases = cfg.baseLayers || [];
    var def = bases.filter(function(b){ return b.defaultOn; })[0] || bases[0];
    if(def){ selectBase(def.id, true); call('onBase', def.id); }
    if(cfg.applyDefaults !== false){
      (cfg.layers || []).forEach(function(it){ applyLayer(it, !!it.defaultOn && !it.disabled, true); });
    }

    // popups the map binds itself (bindPopup) also keep clear of the chip and panel
    popupDefaults();
    var raf = null;
    global.addEventListener('resize', function(){
      if(raf) return;
      raf = (global.requestAnimationFrame || setTimeout)(function(){ raf = null; refresh(); popupDefaults(); });
    });
    // on a small box a popup and an open panel would fight for space
    map.on('popupopen', function(){ if(narrow() && S.ui.body && !S.ui.body.hidden) setPanel(false); });
    refresh();
    return api;
  }

  /* change a control from code; does not call the handler */
  function setChecked(key, on){
    if(S.baseItems[key]){ if(on) selectBase(key, true); return; }
    var input = S.inputs['layer:' + key] || S.inputs['legend:' + key];
    if(input) input.checked = !!on;
    if(S.layerItems[key]) applyLayer(S.layerItems[key], !!on, false);
  }

  /* Leaflet options for L.map(): animations off when the visitor asks for reduced motion */
  function motionOptions(){
    var calm = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    return {zoomAnimation:!calm, fadeAnimation:!calm, markerZoomAnimation:!calm, inertia:!calm};
  }

  var api = {
    version:VERSION,
    init:init,
    motionOptions:motionOptions,
    setLegend:setLegend,
    setStatus:setStatus,
    setChecked:setChecked,
    openPanel:function(){ setPanel(true); },
    closePanel:function(){ setPanel(false); },
    isPanelOpen:function(){ return !!(S.ui.body && !S.ui.body.hidden); },
    popupOptions:popupOptions,
    popup:popup
  };
  global.RadsMap = api;
})(window);
