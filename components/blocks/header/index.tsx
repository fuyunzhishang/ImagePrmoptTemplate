"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Header as HeaderType } from "@/types/blocks/header";
import Icon from "@/components/icon";
import { Link } from "@/i18n/routing";
import LocaleToggle from "@/components/locale/toggle";
import { Menu } from "lucide-react";
import ThemeToggle from "@/components/theme/toggle";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { trackPriceMenuClick } from "@/lib/analytics";
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";

export default function Header({ header }: { header: HeaderType }) {
  const [isSticky, setIsSticky] = useState(false);
  const { data: session, status } = useSession();
  const t = useTranslations("user");
  const tHeader = useTranslations("header");

  // 调试：打印 session 信息
  useEffect(() => {
    if (session?.user) {
      console.log('[Header] Session user:', {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      });
    }
  }, [session]);

  // 处理菜单项点击
  const handleMenuClick = (itemTitle: string, itemUrl: string) => {
    // 追踪 Pricing 菜单点击
    if (itemUrl.includes('/pricing') || itemTitle.toLowerCase().includes('price')) {
      trackPriceMenuClick();
    }
  };
  
  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsSticky(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  if (header.disabled) {
    return null;
  }

  return (
    <>
      {/* 占位元素，避免吸顶时内容跳动 */}
      {isSticky && <div className="h-[88px]" />}
      
      <section
        className={cn(
          "py-4 transition-all duration-300",
          isSticky
            ? "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm"
            : "relative bg-transparent"
        )}
      >
        <div className="container">
          <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link
              href={(header.brand?.url as any) || "/"}
              className="flex items-center gap-2"
            >
              {header.brand?.logo?.src && (
                <img
                  src={header.brand.logo.src}
                  alt="Pixmind"
                  className="w-8"
                  style={{width: '145px', height: '45px'}}
                />
              )}
              {/* {header.brand?.title && (
                <span className="text-xl text-primary font-bold">
                  {header.brand?.title || ""}
                </span>
              )} */}
            </Link>
            <div className="flex items-center">
              <NavigationMenu delayDuration={100} skipDelayDuration={300}>
                <NavigationMenuList>
                  {header.nav?.items?.map((item, i) => {
                    if (item.children && item.children.length > 0) {
                      return (
                        <NavigationMenuItem
                          key={i}
                          className="text-muted-foreground relative"
                        >
                          <NavigationMenuTrigger className="text-foreground font-medium hover:text-primary">
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-4 shrink-0 mr-2"
                              />
                            )}
                            <span>{item.title}</span>
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <ul className="w-80 p-3">
                              {item.children.map((iitem, ii) => {
                                // 如果二级菜单有children（三级菜单），渲染分组标题
                                if (iitem.children && iitem.children.length > 0) {
                                  return (
                                    <li key={ii} className="mb-2">
                                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        {iitem.title}
                                      </div>
                                      <ul>
                                        {iitem.children.map((iiitem, iii) => (
                                          <li key={iii}>
                                            <NavigationMenuLink asChild>
                                              <Link
                                                className={cn(
                                                  "flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                                )}
                                                href={iiitem.url as any}
                                                target={iiitem.target}
                                              >
                                                {iiitem.icon && (
                                                  <Icon
                                                    name={iiitem.icon}
                                                    className="size-5 shrink-0"
                                                  />
                                                )}
                                                <div>
                                                  <div className="text-sm font-semibold">
                                                    {iiitem.title}
                                                  </div>
                                                  <p className="text-sm leading-snug text-muted-foreground">
                                                    {iiitem.description}
                                                  </p>
                                                </div>
                                              </Link>
                                            </NavigationMenuLink>
                                          </li>
                                        ))}
                                      </ul>
                                    </li>
                                  );
                                }
                                // 否则渲染普通二级菜单项
                                return (
                                  <li key={ii}>
                                    <NavigationMenuLink asChild>
                                      <Link
                                        className={cn(
                                          "flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                        )}
                                        href={iitem.url as any}
                                        target={iitem.target}
                                      >
                                        {iitem.icon && (
                                          <Icon
                                            name={iitem.icon}
                                            className="size-5 shrink-0"
                                          />
                                        )}
                                        <div>
                                          <div className="text-sm font-semibold">
                                            {iitem.title}
                                          </div>
                                          <p className="text-sm leading-snug text-muted-foreground">
                                            {iitem.description}
                                          </p>
                                        </div>
                                      </Link>
                                    </NavigationMenuLink>
                                  </li>
                                );
                              })}
                            </ul>
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      );
                    }

                    return (
                      <NavigationMenuItem key={i}>
                        <Link
                          className={cn(
                            "text-foreground font-medium hover:text-primary transition-colors",
                            navigationMenuTriggerStyle,
                            buttonVariants({
                              variant: "ghost",
                            })
                          )}
                          href={item.url as any}
                          target={item.target}
                          onClick={() => handleMenuClick(item.title || '', item.url || '')}
                        >
                          {item.icon && (
                            <Icon
                              name={item.icon}
                              className="size-4 shrink-0 mr-0"
                            />
                          )}
                          {item.title}
                        </Link>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
              <a
                href="https://www.pixmind.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-medium hover:text-primary transition-colors px-4 py-2 text-sm"
              >
                {tHeader("official_site")}
              </a>
            </div>
          </div>
          <div className="shrink-0 flex gap-2 items-center">
            {header.show_locale && <LocaleToggle />}
            {header.show_theme && <ThemeToggle />}

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="my-profile">{t('my_profile')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="my-orders">{t('my_orders')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="pricing">{t('recharge_credits')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    {t('sign_out')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              header.buttons?.map((item, i) => {
                // 如果是登录按钮，触发登录弹窗
                if (item.url === '/auth/signin') {
                  return (
                    <Button
                      key={i}
                      variant={item.variant}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-sign-modal'));
                      }}
                    >
                      {item.title}
                      {item.icon && (
                        <Icon name={item.icon} className="size-4 shrink-0" />
                      )}
                    </Button>
                  );
                }

                // 其他按钮保持原样
                return (
                  <Button key={i} variant={item.variant}>
                    <Link
                      href={item.url as any}
                      target={item.target || ""}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      {item.title}
                      {item.icon && (
                        <Icon name={item.icon} className="size-4 shrink-0" />
                      )}
                    </Link>
                  </Button>
                );
              })
            )}
          </div>
        </nav>

        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link
              href={(header.brand?.url || "/") as any}
              className="flex items-center gap-2"
            >
              {header.brand?.logo?.src && (
                <img
                  src={header.brand.logo.src}
                  alt="Pixmind"
                  style={{width: '150px'}}
                />
              )}
              {header.brand?.title && (
                <span className="text-xl font-bold">
                  {header.brand?.title || ""}
                </span>
              )}
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="default" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Link
                      href={(header.brand?.url || "/") as any}
                      className="flex items-center gap-2"
                    >
                      {header.brand?.logo?.src && (
                        <img
                          src={header.brand.logo.src}
                          alt="Pixmind"
                          style={{width: '150px'}}
                        />
                      )}
                      {header.brand?.title && (
                        <span className="text-xl font-bold">
                          {header.brand?.title || ""}
                        </span>
                      )}
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="mb-8 mt-8 flex flex-col gap-4">
                  <Accordion type="single" collapsible className="w-full">
                    {header.nav?.items?.map((item, i) => {
                      if (item.children && item.children.length > 0) {
                        return (
                          <AccordionItem
                            key={i}
                            value={item.title || ""}
                            className="border-b-0"
                          >
                            <AccordionTrigger className="mb-4 py-0 font-semibold hover:no-underline text-left">
                              {item.title}
                            </AccordionTrigger>
                            <AccordionContent className="mt-2">
                              {item.children.map((iitem, ii) => {
                                // 如果二级菜单有children（三级菜单），渲染分组
                                if (iitem.children && iitem.children.length > 0) {
                                  return (
                                    <div key={ii} className="mb-3">
                                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        {iitem.title}
                                      </div>
                                      {iitem.children.map((iiitem, iii) => (
                                        <Link
                                          key={iii}
                                          className={cn(
                                            "flex select-none gap-4 rounded-md p-3 leading-none outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                          )}
                                          href={iiitem.url as any}
                                          target={iiitem.target}
                                        >
                                          {iiitem.icon && (
                                            <Icon
                                              name={iiitem.icon}
                                              className="size-4 shrink-0"
                                            />
                                          )}
                                          <div>
                                            <div className="text-sm font-semibold">
                                              {iiitem.title}
                                            </div>
                                            <p className="text-sm leading-snug text-muted-foreground">
                                              {iiitem.description}
                                            </p>
                                          </div>
                                        </Link>
                                      ))}
                                    </div>
                                  );
                                }
                                // 否则渲染普通二级菜单项
                                return (
                                  <Link
                                    key={ii}
                                    className={cn(
                                      "flex select-none gap-4 rounded-md p-3 leading-none outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                    )}
                                    href={iitem.url as any}
                                    target={iitem.target}
                                  >
                                    {iitem.icon && (
                                      <Icon
                                        name={iitem.icon}
                                        className="size-4 shrink-0"
                                      />
                                    )}
                                    <div>
                                      <div className="text-sm font-semibold">
                                        {iitem.title}
                                      </div>
                                      <p className="text-sm leading-snug text-muted-foreground">
                                        {iitem.description}
                                      </p>
                                    </div>
                                  </Link>
                                );
                              })}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      }
                      return (
                        <Link
                          key={i}
                          href={item.url as any}
                          target={item.target}
                          className="font-semibold my-4 flex items-center gap-2 px-4"
                        >
                          {item.icon && (
                            <Icon
                              name={item.icon}
                              className="size-4 shrink-0"
                            />
                          )}
                          {item.title}
                        </Link>
                      );
                    })}
                  </Accordion>
                  <a
                    href="https://www.pixmind.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold my-4 flex items-center gap-2 px-4"
                  >
                    {tHeader("official_site")}
                  </a>
                </div>
                <div className="flex-1"></div>
                <div className="border-t pt-4">
                  <div className="mt-2 flex flex-col gap-3">
                    {session ? (
                      <>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex flex-col">
                            <p className="text-sm font-medium">{session.user?.name}</p>
                            <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button variant="ghost" className="justify-start" asChild>
                            <Link href="my-profile">{t('my_profile')}</Link>
                          </Button>
                          <Button variant="ghost" className="justify-start" asChild>
                            <Link href="my-orders">{t('my_orders')}</Link>
                          </Button>
                          <Button variant="ghost" className="justify-start" asChild>
                            <Link href="pricing">{t('recharge_credits')}</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => signOut()}
                          >
                            {t('sign_out')}
                          </Button>
                        </div>
                      </>
                    ) : (
                      header.buttons?.map((item, i) => {
                        // 如果是登录按钮，触发登录弹窗
                        if (item.url === '/auth/signin') {
                          return (
                            <Button
                              key={i}
                              variant={item.variant}
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent('open-sign-modal'));
                              }}
                            >
                              {item.title}
                              {item.icon && (
                                <Icon
                                  name={item.icon}
                                  className="size-4 shrink-0"
                                />
                              )}
                            </Button>
                          );
                        }

                        // 其他按钮保持原样
                        return (
                          <Button key={i} variant={item.variant}>
                            <Link
                              href={item.url as any}
                              target={item.target || ""}
                              className="flex items-center gap-1"
                            >
                              {item.title}
                              {item.icon && (
                                <Icon
                                  name={item.icon}
                                  className="size-4 shrink-0"
                                />
                              )}
                            </Link>
                          </Button>
                        );
                      })
                    )}

                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {header.show_locale && <LocaleToggle />}
                    <div className="flex-1"></div>

                    {header.show_theme && <ThemeToggle />}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        </div>
      </section>
    </>
  );
}
