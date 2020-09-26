import { useEffect, useMemo, useState, useReducer, useRef } from 'react';
import flattenOptions from './lib/flattenOptions';
import groupOptions from './lib/groupOptions';
import highlightReducer from './highlightReducer';
import getOption from './lib/getOption';
import getNewValue from './lib/getNewValue';
import getDisplayValue from './lib/getDisplayValue';
import debounce from './lib/debounce';
export default function useSelect({
  value: defaultValue = null,
  options: defaultOptions = [],
  search: canSearch = false,
  multiple = false,
  disabled = false,
  allowEmpty = true,
  closeOnSelect = true,
  getOptions = null,
  onChange = () => {},
  debounce: debounceTime = 0
}) {
  const ref = useRef(null);
  const flattenedOptions = useMemo(() => flattenOptions(defaultOptions), [defaultOptions]);
  const [value, setValue] = useState(defaultValue);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);
  const [focus, setFocus] = useState(false);
  const [highlighted, dispatchHighlighted] = useReducer(highlightReducer, -1);
  const [options, setOptions] = useState(flattenedOptions);
  const [option, setOption] = useState(() => getOption(value, options));
  const groupedOptions = useMemo(() => groupOptions(options), [options]);
  const fetchOptions = useMemo(() => debounce(q => {
    const optionsReq = getOptions(q, flattenedOptions, value);
    setFetching(true);
    Promise.resolve(optionsReq).then(newOptions => setOptions(flattenOptions(newOptions))).finally(() => setFetching(false));
  }, debounceTime), [flattenedOptions, value, getOptions, debounceTime]);
  const snapshot = {
    options: groupedOptions,
    option,
    displayValue: getDisplayValue(!option && !allowEmpty && options.length ? options[0] : option),
    value,
    search,
    fetching,
    focus,
    highlighted,
    disabled
  };

  const onFocus = () => setFocus(true);

  const onBlur = () => {
    setFocus(false);
    setOptions(flattenedOptions);
    setSearch('');

    if (ref.current) {
      ref.current.blur();
    }
  };

  const onSelect = id => {
    // eslint-disable-next-line no-underscore-dangle,eqeqeq
    const item = id ? options.find(i => i.value == id) : options[highlighted];

    if (!item) {
      return;
    }

    const newValues = getNewValue(item.value, value, multiple);
    const newOption = getOption(newValues, options);
    setValue(newValues);
    setOption(newOption);
    onChange(newValues, newOption);
  };

  const onMouseDown = e => {
    if (!closeOnSelect) {
      e.preventDefault();
    }

    onSelect(e.currentTarget.value);
  };

  const onKeyDown = e => {
    const {
      key
    } = e;

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      e.preventDefault();
      dispatchHighlighted({
        key,
        options
      });
    }
  };

  const onKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSelect();

      if (closeOnSelect) {
        onBlur();
      }
    }
  };

  const onKeyUp = ({
    key
  }) => {
    if (key === 'Escape') {
      onBlur();
    }
  };

  const onSearch = ({
    target
  }) => setSearch(target.value);

  const valueProps = {
    tabIndex: '0',
    readOnly: !canSearch,
    onFocus,
    onBlur,
    onKeyPress,
    onKeyDown,
    onKeyUp,
    onChange: canSearch ? onSearch : null,
    disabled,
    ref
  };
  const optionProps = {
    tabIndex: '-1',
    onMouseDown,
    onKeyDown,
    onKeyPress,
    onBlur
  };
  useEffect(() => setValue(defaultValue), [defaultValue]);
  useEffect(() => setOptions(flattenedOptions), [flattenedOptions]);
  useEffect(() => {
    fetchOptions(search);
  }, [search, fetchOptions]);
  return [snapshot, valueProps, optionProps, setValue];
}