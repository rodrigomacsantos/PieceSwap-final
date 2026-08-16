import { Link } from "react-router-dom";
import { Instagram, Twitter, Facebook, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border text-card-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-xl">P</span>
              </div>
              <span className="font-display font-bold text-xl">PieceSwap</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-6">
              A maior comunidade de compra, venda e troca de peças LEGO em Portugal.
            </p>
            <div className="flex gap-4">
              {[
                { Icon: Instagram, label: "Instagram", href: "https://www.instagram.com/" },
                { Icon: Twitter, label: "Twitter", href: "https://twitter.com/" },
                { Icon: Facebook, label: "Facebook", href: "https://www.facebook.com/" },
                { Icon: Youtube, label: "YouTube", href: "https://www.youtube.com/" },
              ].map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            {
              title: "Explorar",
              links: [
                { label: "Marketplace", href: "/marketplace" },
                { label: "Trocar", href: "/swap" },
                { label: "Premium", href: "/premium" },
              ],
            },
            {
              title: "Suporte",
              links: [
                { label: "Centro de Ajuda", href: "/help" },
                { label: "Segurança", href: "/security" },
                { label: "Contacto", href: "/contact" },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Termos e Condições", href: "/terms" },
                { label: "Privacidade", href: "/privacy" },
                { label: "Cookies", href: "/cookies" },
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="font-display font-bold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 PieceSwap. Todos os direitos reservados.
          </p>
          <p className="text-muted-foreground text-sm">
            LEGO® é uma marca registada do LEGO Group. Este site não é afiliado ao LEGO Group.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;