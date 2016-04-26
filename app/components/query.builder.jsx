"use strict";
import React from 'react'
import classNames from 'classnames'
import TypeUtil from 'app/components/typeahead.util.js'
var Api = require('../api.js');
var endsWith = require('lodash/endsWith');
var debounce = require('lodash/debounce');
var getLastWord = require('./cursor.js');


function VariableDetail(props) {
  var selected = props.selected;
  var lead = selected ? selected.name : 'Custom Query Example';
  var example = <p>
    Price to earning &lt; 15 AND
    <br />
    Return on capital employed &gt; 22%
  </p>;
  var help = <a href="http://blog.screener.in/2012/07/creating-stock-screens/">
    Detailed guide on creating stock screens
  </a>;
  var unit = selected && <span>
    Value in: {selected.unit || "No unit"}
  </span>;
  var description = selected ? <p>{selected.description}</p> : example;
  help = selected ? unit : help;
  return <div className={props.className}>
    <p className="lead">{lead}</p>
    {description}
    <small>{help}</small>
  </div>;
}

VariableDetail.propTypes = {
  selected: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.object
  ]),
  className: React.PropTypes.string
}


export class QueryBuilder extends React.Component {

  constructor(props, context) {
    super(props, context);
    // TypeaheadUtil defaults
    this.handleKeyDown = TypeUtil.handleKeyDown.bind(this);
    this.handleBlur = TypeUtil.handleBlur.bind(this);
    this.hideMenu = TypeUtil.hideMenu.bind(this);
    this.handleUnmount = TypeUtil.handleUnmount.bind(this);
    // End TypeaheadUtil defaults
    this.handleChange = this.handleChange.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.state = {
      options: [],
      lastWord: '',
      cursorPos: 0,
      index: -1,
      hideMenu: true,
      selected: false
    };
  }

  getOptions() {
    return this.state.options;
  }

  getDisplayVal(item) {
    return item.name;
  }

  insertThis(replacor, replacee) {
    var fullVal = this.refs.input.value;
    var tillCursor = fullVal.substring(0, this.state.cursorPos);
    var insertPos = tillCursor.lastIndexOf(replacee);
    if (insertPos == -1)
      return;
    var before = fullVal.substring(0, insertPos);
    var after = fullVal.substring(this.state.cursorPos);
    var newVal = before + replacor + after;
    var newPos = newVal.length - after.length;
    this.refs.input.value = newVal;
    this.refs.input.selectionStart = newPos;
    this.refs.input.selectionEnd = newPos;
    this.hideMenu();
  }

  fetchOptions(word) {
    return Api.get(['ratios', 'search'], {q: word}).then(
      response => this.setState({options: response})
    );
  }

  handleChange() {
    var cursorPos = this.refs.input.selectionStart;
    var fullVal = this.refs.input.value;
    var tillCursor = fullVal.substring(0, cursorPos);
    var lastWord = getLastWord(tillCursor).trim();
    var normalized = lastWord.toLowerCase();
    this.setState({
      lastWord: lastWord,
      cursorPos: cursorPos
    });
    if(endsWith(normalized, ' and')) {
      this.insertThis(' AND\n', lastWord.substr(-4));
      return;
    }
    if(lastWord.length >= 2 && isNaN(lastWord)) {
      this.fetchOptions(lastWord);
      this.setState({
        hideMenu: false,
        index: 0
      });
    } else {
      this.hideMenu();
    }
  }

  handleSelect(index) {
    var selected = this.state.options[index];
    this.setState({selected: selected});
    var displayVal = this.getDisplayVal(selected) + ' ';
    this.insertThis(displayVal, this.state.lastWord);
  }

  renderOptions() {
    var options = this.state.options.map(function(option, idx) {
      return (
        <li key={idx}
            onClick={this.handleSelect.bind(null, idx)}
            className={idx == this.state.index ? 'active' : ''}>
          <a>{this.getDisplayVal(option)}</a>
        </li>
      );
    }, this);
    return options;
  }

  render() {
    var opLen = this.state.options.length;
    var queryError = this.props.error && <span className="help-block">
      {this.props.error}
    </span>;
    var classes = classNames('col-md-8 dropdown', {
      'open': opLen > 0 && !this.state.hideMenu,
      'has-error': queryError
    });
    return <div className="row">
      <div className={classes}>
        <textarea
          autoComplete="off"
          spellCheck="false"
          required
          onKeyDown={this.handleKeyDown}
          onChange={debounce(this.handleChange, 120)}
          onBlur={this.handleBlur}
          placeholder={this.props.placeholder}
          defaultValue={this.props.value}
          className="form-control"
          rows="7"
          ref="input"
          name={this.props.name}
        />
        {queryError}
        <ul className="dropdown-menu">
          {this.renderOptions()}
        </ul>
      </div>
      <VariableDetail
        selected={this.state.selected}
        className="callout callout-info col-md-4"
      />
    </div>
  }
}

QueryBuilder.propTypes = {
  name: React.PropTypes.string.isRequired,
  placeholder: React.PropTypes.string.isRequired,
  value: React.PropTypes.string,
  error: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.string
  ])
}

module.exports = QueryBuilder