import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STRATEGY_GUIDE_SECTIONS } from "@/lib/strategy-guide-content";

export default function StrategyGuidePage() {
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Strategy Building Guide
      </h1>
      <p className="mb-6 text-muted-foreground">
        Learn how to build effective trading strategies
      </p>

      <div className="space-y-6">
        {STRATEGY_GUIDE_SECTIONS.map((section) => (
          <Card key={section.id} id={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-muted-foreground">{section.intro}</p>
              <ul className="list-inside list-disc space-y-2 text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <strong className="text-foreground">{item.label}:</strong>{" "}
                    {item.description}
                  </li>
                ))}
              </ul>
              {section.footer && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {section.footer}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-400">
              Need More Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 dark:text-blue-400">
              If you&apos;re still seeing validation errors after reading this
              guide, double-check that all required blocks are present and
              properly connected. Error messages will point you to the specific
              block or connection that needs attention.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
