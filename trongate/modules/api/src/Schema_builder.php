<?php
/**
 * Turns `Api_schema` classes into JSON Schema, collecting named components.
 *
 * Reads only what PHP already declares: property names, types and nullability.
 * `Api_field` fills in what a type cannot carry (descriptions, examples, array
 * element types, integer formats).
 */
final class Schema_builder {

    /** @var array<string, array<string, mixed>> Component name => schema. */
    private array $components = [];

    /** @var array<string, string> Class name => component name, as resolved. */
    private array $names = [];

    /**
     * @return array<string, array<string, mixed>>
     */
    public function components(): array {
        ksort($this->components);
        return $this->components;
    }

    /**
     * A `$ref` to $class's component, registering it (and everything it
     * reaches) on first use.
     *
     * @param class-string $class
     * @return array<string, string>
     */
    public function ref(string $class): array {
        if (!isset($this->names[$class])) {
            $reflection = new ReflectionClass($class);
            $meta = self::schema_attribute($reflection);
            $name = $meta?->name ?? $reflection->getShortName();

            // Claim the name before descending, so a schema that refers to
            // itself terminates instead of recursing forever.
            $this->names[$class] = $name;
            if (isset($this->components[$name])) {
                throw new LogicException("schema name {$name} is used by two classes");
            }
            $this->components[$name] = [];
            $this->components[$name] = $this->build($reflection, $meta);
        }

        return ['$ref' => '#/components/schemas/' . $this->names[$class]];
    }

    /**
     * @return array<string, mixed>
     */
    private function build(ReflectionClass $class, ?Api_schema $meta): array {
        if ($class->isEnum()) {
            $schema = ['type' => 'string'];
            self::describe($schema, $meta?->description ?? '');
            $schema['enum'] = array_map(static fn (BackedEnum $case) => $case->value, $class->getName()::cases());
            return $schema;
        }

        if ($meta !== null && $meta->one_of !== []) {
            $schema = ['oneOf' => array_map(fn (string $variant) => $this->object_schema(new ReflectionClass($variant)), $meta->one_of)];
            self::describe($schema, $meta->description);
            return $schema;
        }

        $schema = $this->object_schema($class);
        if ($meta !== null && $meta->description !== '') {
            // `description` sits after `type`, where utoipa puts it.
            $schema = ['type' => 'object', 'description' => $meta->description] + $schema;
        }
        return $schema;
    }

    /**
     * @return array<string, mixed>
     */
    private function object_schema(ReflectionClass $class): array {
        $variant = ($class->getAttributes(Api_variant::class)[0] ?? null)?->newInstance();
        $required = [];
        $properties = [];

        foreach ($class->getProperties(ReflectionProperty::IS_PUBLIC) as $property) {
            if ($property->isStatic()) {
                continue;
            }

            $name = $property->getName();
            $type = $property->getType();
            if (!$type instanceof ReflectionNamedType) {
                throw new LogicException("{$class->getName()}::\${$name} needs a single declared type to be documented");
            }

            if ($variant !== null && $name === $variant->tag) {
                $properties[$name] = ['type' => 'string', 'enum' => [$variant->value]];
                $required[] = $name;
                continue;
            }

            $field = self::field_attribute($property);
            $properties[$name] = $this->type_schema($type, $field, "{$class->getName()}::\${$name}");
            if (!$type->allowsNull()) {
                $required[] = $name;
            }
        }

        ksort($properties);
        return ['type' => 'object', 'required' => $required, 'properties' => $properties];
    }

    /**
     * @return array<string, mixed>
     */
    private function type_schema(ReflectionNamedType $type, ?Api_field $field, string $where): array {
        $schema = $this->named_type_schema($type->getName(), $field, $where);

        if ($type->allowsNull() && $type->getName() !== 'mixed') {
            if (isset($schema['$ref'])) {
                $schema = ['oneOf' => [['type' => 'null'], $schema]];
            } else {
                $schema['type'] = [$schema['type'], 'null'];
            }
        }

        if ($field !== null) {
            self::describe($schema, $field->description);
            if ($field->example !== null) {
                $schema['example'] = $field->example;
            }
            if ($field->minimum !== null) {
                $schema['minimum'] = $field->minimum;
            }
        }

        return $schema;
    }

    /**
     * @return array<string, mixed>
     */
    private function named_type_schema(string $name, ?Api_field $field, string $where): array {
        $integer_format = $field?->format ?? 'int64';

        return match ($name) {
            'string' => ['type' => 'string'] + ($field?->format !== null ? ['format' => $field->format] : []),
            'int' => ['type' => 'integer', 'format' => $integer_format],
            'float' => ['type' => 'number', 'format' => $field?->format ?? 'double'],
            'bool' => ['type' => 'boolean'],
            'array' => [
                'type' => 'array',
                'items' => $this->named_type_schema(
                    $field?->items ?? throw new LogicException("{$where} is an array; name its element type with #[Api_field(items: ...)]"),
                    null,
                    $where,
                ),
            ],
            default => class_exists($name) || enum_exists($name) || interface_exists($name)
                ? $this->ref($name)
                : throw new LogicException("{$where} has type {$name}, which has no schema"),
        };
    }

    private static function describe(array &$schema, string $description): void {
        if ($description !== '') {
            $schema['description'] = $description;
        }
    }

    private static function schema_attribute(ReflectionClass $class): ?Api_schema {
        return ($class->getAttributes(Api_schema::class)[0] ?? null)?->newInstance();
    }

    private static function field_attribute(ReflectionProperty $property): ?Api_field {
        return ($property->getAttributes(Api_field::class)[0] ?? null)?->newInstance();
    }
}
