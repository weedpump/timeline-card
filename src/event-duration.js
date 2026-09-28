function timestamp(value) {
  return value instanceof Date ? value.getTime() : Number(value);
}

export function annotateEventDurations(items) {
  const annotated = items.map((item) => ({ ...item, endTime: null }));
  const previousByEntity = new Map();

  for (const item of annotated) {
    const previous = previousByEntity.get(item.id);
    if (previous && timestamp(item.time) >= timestamp(previous.time)) {
      previous.endTime = item.time;
    }
    previousByEntity.set(item.id, item);
  }

  return annotated;
}

export function closePreviousEvent(items, nextItem) {
  const previous = items.find(
    (item) => item.id === nextItem.id && item.endTime == null
  );

  if (!previous || timestamp(nextItem.time) < timestamp(previous.time)) {
    return false;
  }

  previous.endTime = nextItem.time;
  return true;
}

export function insertLiveEvent(
  items,
  nextItem,
  { collapseDuplicates = false, keepMode = 'earliest' } = {}
) {
  const previousIndex = items.findIndex(
    (item) => item.id === nextItem.id && item.endTime == null
  );
  const previous = previousIndex >= 0 ? items[previousIndex] : null;

  if (collapseDuplicates && previous?.raw_state === nextItem.raw_state) {
    if (keepMode !== 'latest') return false;

    const precedingEvent = items.find(
      (item) =>
        item.id === nextItem.id &&
        item.endTime != null &&
        timestamp(item.endTime) === timestamp(previous.time)
    );
    if (precedingEvent) precedingEvent.endTime = nextItem.time;

    items.splice(previousIndex, 1);
    items.unshift(nextItem);
    return true;
  }

  closePreviousEvent(items, nextItem);
  items.unshift(nextItem);
  return true;
}
