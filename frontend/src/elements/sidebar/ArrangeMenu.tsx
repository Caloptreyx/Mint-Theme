import { faArrowsUpDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tooltip } from '@mantine/core';
import { Fragment, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Modal, ModalFooter, Stack, Text } from '../../lib/core.ts';
import { isEmptyNavOrder, mergeNavOrder, type NavMenu, type NavOrder, navLinkId } from '../../lib/navOrder.ts';
import { useExtTranslations } from '../../translations.ts';
import NavArranger, { type ArrangeItem, arrangedOrder, toArrangeItems } from './NavArranger.tsx';
import { arrangeMenu, groupNav, saveOwnNavOrder, swapLink, useNavOrders } from './nav.ts';

const NAV_ID = 'data-nebula-nav-id';

/**
 * The modal's content, mounted only while it is open. Core keeps links the user may not open in the menu inside a
 * permission wrapper (`ServerCan`) that renders nothing, so the wrappers render a marker per link in a hidden probe
 * first, and only links that left a marker are listed.
 */
function ArrangeBody({
  menu,
  nodes,
  site,
  own,
  onClose,
}: {
  menu: NavMenu;
  nodes: ReactNode[];
  site: NavOrder;
  own: NavOrder;
  onClose: () => void;
}) {
  const { t } = useExtTranslations();
  const probe = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ArrangeItem[] | null>(null);
  const [changed, setChanged] = useState(false);

  // once per open: the sidebar re-renders while the modal is up (a server's state), which must not undo a drag
  useLayoutEffect(() => {
    const markers = probe.current?.querySelectorAll(`[${NAV_ID}]`) ?? [];
    const visible = new Set([...markers].map((marker) => marker.getAttribute(NAV_ID) ?? ''));
    setItems(toArrangeItems(groupNav(arrangeMenu(nodes, [site, own])), visible));
  }, []);

  const save = () => {
    if (items) saveOwnNavOrder(menu, mergeNavOrder(own, arrangedOrder(items)));
    onClose();
  };

  const reset = () => {
    saveOwnNavOrder(menu, null);
    onClose();
  };

  return (
    <Stack gap='sm'>
      <div ref={probe} hidden>
        {nodes.map((node, index) => (
          <Fragment key={index}>
            {swapLink(node, (link) => (
              <span {...{ [NAV_ID]: navLinkId(link.to) }} />
            ))}
          </Fragment>
        ))}
      </div>
      <Text size='sm' c='dimmed'>
        {t(`arrangeMenu.description.${menu}`, {})}
      </Text>
      {items && (
        <NavArranger
          items={items}
          onChange={(next) => {
            setItems(next);
            setChanged(true);
          }}
        />
      )}
      <ModalFooter>
        <Button variant='default' disabled={isEmptyNavOrder(own)} onClick={reset} className='mr-auto'>
          {t('arrangeMenu.reset', {})}
        </Button>
        <Button variant='default' onClick={onClose}>
          {t('arrangeMenu.cancel', {})}
        </Button>
        <Button disabled={!changed} onClick={save}>
          {t('arrangeMenu.save', {})}
        </Button>
      </ModalFooter>
    </Stack>
  );
}

/**
 * 'Arrange menu' at the end of the side menu (`compact`: an icon, for the top bar) and the modal it opens: the
 * user's own order for the menu of the page they are on, kept in `nebula::nav_order`. `nodes` is the menu as core
 * renders it, before any order. In the slim rail `buildCss` shrinks the row to its icon, so there it is named in a
 * tooltip, like RailTip does for core's links; the drawer renders the same row with its label.
 */
export default function ArrangeMenu({
  nodes,
  compact = false,
  rail = false,
}: {
  nodes: ReactNode[];
  compact?: boolean;
  rail?: boolean;
}) {
  const { t } = useExtTranslations();
  const { menu, site, own } = useNavOrders();
  const [opened, setOpened] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [inRail, setInRail] = useState(false);

  useLayoutEffect(() => {
    setInRail(rail && !!wrap.current?.closest('#sidebar-desktop'));
  }, [rail]);

  if (!menu) return null;

  const label = t('arrangeMenu.open', {});

  return (
    <>
      {/* as in RailTip, the tooltip and the rail check anchor on a plain element around core's button */}
      <Tooltip label={label} position={compact ? 'bottom' : 'right'} offset={14} disabled={!compact && !inRail}>
        <div ref={wrap} className='shrink-0'>
          {compact ? (
            <ActionIcon variant='subtle' color='gray' aria-label={label} onClick={() => setOpened(true)}>
              <FontAwesomeIcon icon={faArrowsUpDown} />
            </ActionIcon>
          ) : (
            // the markup of core's Sidebar.Link button, so it lines up with the links and the rail styles it the same
            <Button
              variant='subtle'
              color='gray'
              c='dimmed'
              fullWidth
              className='nebula-arrange mt-1'
              styles={{ label: { width: '100%' } }}
              onClick={() => setOpened(true)}
            >
              <FontAwesomeIcon icon={faArrowsUpDown} className='mr-2' /> {label}
            </Button>
          )}
        </div>
      </Tooltip>
      <Modal opened={opened} onClose={() => setOpened(false)} title={t('arrangeMenu.title', {})}>
        <ArrangeBody menu={menu} nodes={nodes} site={site} own={own} onClose={() => setOpened(false)} />
      </Modal>
    </>
  );
}
